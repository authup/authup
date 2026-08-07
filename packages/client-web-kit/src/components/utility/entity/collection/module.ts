/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@authup/kit';
import { buildQueryString, pickEntityAPI } from '@authup/core-http-kit';
import type { EntityTypeMap } from '@authup/core-kit';
import {
    VCList,
    VCListBody,
    VCListEmpty,
    VCListItem,
    VCListLoading,
} from '@vuecs/list';
import type {
    FiltersBuildInput,
    ICondition,
    IFilters,
    IQuery,
    PaginationBuildInput,
} from '@rapiq/core';
import {
    Query,
    contains,
    defineFilters,
    definePagination,
    isQuery,
    mergeQueries,
} from '@rapiq/core';
import type { EntityListQueryInput } from '../../../../core';
import type { Ref, VNodeChild } from 'vue';
import {
    Fragment,
    computed,
    h,
    isRef,
    onServerPrefetch,
    ref,
    unref,
} from 'vue';
import { EntityCollectionSlotName } from './constants';
import { isObject } from 'smob';
import { boolableToObject } from '../../../../utils';
import { injectHTTPClient } from '../../../../core/http-client';
import { injectHydrationStore } from '../../../../core/hydration';
import { defineEntitySocketManager } from '../socket';
import type { EntitySocketManagerCreateContext } from '../socket';
import {
    isCondition,
    isQuerySortedDescByDate,
    normalizeQueryInput,
} from '../../../../core/query';
import type {
    EntityCollectionHydrationSnapshot,
    EntityCollectionManager,
    EntityCollectionManagerCreateContext,
    EntityCollectionRenderOptions,
    ListFooterOptions,
    ListHeaderOptions,
    ListItemSlotProps,
    ListLoadingOptions,
    ListMeta,
    ListNoMoreOptions,
    ListSlotProps,
} from './types';
import {
    ListHandlers,
    mergeEntityCollectionRenderOptions,
} from './utils';
import { isError } from '@authup/errors';

type Entity<A> = A extends Record<string, any> ? A : never;

type ComposedQuery = {
    query: Query,
    interactive: Query
};

function stripFilters(input: IQuery) : Query {
    return new Query({
        fields: input.fields,
        relations: input.relations,
        sorts: input.sorts,
        pagination: input.pagination,
    });
}

function stripPagination(input: IQuery) : Query {
    return new Query({
        fields: input.fields,
        filters: input.filters,
        relations: input.relations,
        sorts: input.sorts,
    });
}

/**
 * AND-combine interactive filters with an injected scope, so a later
 * input can never displace it — the same guarantee the server pipeline
 * has.
 *
 * Since rapiq beta.19 (tada5hi/rapiq#890) filter composition is
 * conjunctive throughout: `merge` retains every conjunct of both sides
 * instead of replacing same-field conditions. Nothing can displace
 * anything, so the guarantee no longer rests on keeping the scope in a
 * distinguishable subtree and the flattened output below is the plain
 * AND it reads as.
 */
function combineScopedFilters(
    input?: IFilters,
    scope?: IFilters,
) : IFilters | undefined {
    const a = input && input.value.length > 0 ? input : undefined;
    const b = scope && scope.value.length > 0 ? scope : undefined;

    if (a && b) {
        return a.and(b).flatten();
    }

    return a || b;
}

function create<
    TYPE extends keyof EntityTypeMap,
    RECORD extends EntityTypeMap[TYPE],
>(
    context: EntityCollectionManagerCreateContext<TYPE, RECORD>,
) : EntityCollectionManager<RECORD> {
    const data : Ref<RECORD[]> = ref([]);
    const busy = ref(false);
    const total = ref(0);
    const meta = ref<ListMeta>({ pagination: { limit: 10 } });

    const realmId = computed<string | undefined>(
        () => {
            if (context.realmId) {
                return isRef(context.realmId) ? context.realmId.value : context.realmId;
            }

            if (context.props.realmId) {
                return context.props.realmId;
            }

            return undefined;
        },
    );

    const client = injectHTTPClient();
    const hydration = injectHydrationStore();

    const domainAPI = pickEntityAPI<TYPE, Entity<RECORD>>(client, context.type);
    // Captured bound, so the load fn's guard survives the query
    // composition between guard and call (property narrowing does not).
    const getMany = domainAPI?.getMany ?
        domainAPI.getMany.bind(domainAPI) :
        undefined;

    // Last composed query (IR) — read by the socket handler's sort check.
    let query : IQuery | undefined;

    // Whether the last `load` ran to completion. A load that failed leaves the
    // list empty, which must NOT be handed to the client as a result.
    let loadCompleted = false;

    // Interactive query state (search filters, sort changes, ...) retained
    // across loads, so pagination / loadAll continuations keep the current
    // search without round-tripping query state through ListMeta.
    // Pagination is deliberately excluded — it lives in `meta`.
    let interactive : IQuery | undefined;

    const resolveBaseQuery = () : IQuery => {
        let contextQuery : IQuery | undefined;
        if (context.query) {
            contextQuery = normalizeQueryInput(
                typeof context.query === 'function' ? context.query() : context.query,
            );
        }

        let propsQuery : IQuery | undefined;
        if (context.props.query) {
            propsQuery = normalizeQueryInput(context.props.query);
        }

        if (propsQuery && contextQuery) {
            const chrome = mergeQueries(
                stripFilters(propsQuery),
                stripFilters(contextQuery),
            );

            return new Query({
                fields: chrome.fields,
                relations: chrome.relations,
                sorts: chrome.sorts,
                pagination: chrome.pagination,
                filters: combineScopedFilters(propsQuery.filters, contextQuery.filters),
            });
        }

        return propsQuery || contextQuery || new Query();
    };

    const failed = (error: Error) => {
        if (context.setup && typeof context.setup.emit === 'function') {
            context.setup.emit('failed', error);
        }
    };

    // Compose the query a load will send: input parameters over retained
    // interactive state over pagination state over the injected base scope.
    // Pure: the caller decides what to do with the result, so the initial
    // load's query can also be derived up front for the hydration key.
    function composeQuery(input: EntityListQueryInput<Entity<RECORD>>) : ComposedQuery {
        let inputQuery : IQuery;
        let interactiveNext : Query;

        if (isQuery(input)) {
            // An assembled query is taken literally — it replaces the
            // whole interactive state (minus pagination).
            inputQuery = input;
            interactiveNext = stripPagination(input);
        } else {
            inputQuery = normalizeQueryInput(input);

            let filtersOverride : IFilters | undefined;
            if (
                input.filters &&
                !isCondition(input.filters) &&
                hasOwnProperty(input.filters, 'name') &&
                typeof input.filters.name === 'string' &&
                input.filters.name.length > 0
            ) {
                // Search input arrives as a bare `name` string. A raw wire
                // marker (`~text`) is NOT interpreted by the rapiq v2 IR
                // builder (it becomes eq('name','~text')), so build the
                // condition explicitly: the queryFilters hook when provided
                // (richer multi-field search), else a default substring match.
                const transformed = context.queryFilters ?
                    context.queryFilters(input.filters.name) :
                    contains('name', input.filters.name);
                filtersOverride = defineFilters(
                    transformed as FiltersBuildInput | ICondition,
                );
            }

            // Per-parameter replace: a parameter present on the input
            // supersedes the retained interactive value, an absent one
            // keeps it (a pagination-only load keeps the search).
            interactiveNext = new Query({
                fields: 'fields' in input ? inputQuery.fields : interactive?.fields,
                filters: filtersOverride ??
                    ('filters' in input ? inputQuery.filters : interactive?.filters),
                relations: 'relations' in input ? inputQuery.relations : interactive?.relations,
                sorts: 'sort' in input ? inputQuery.sorts : interactive?.sorts,
            });
        }

        const base = resolveBaseQuery();

        const statePagination : PaginationBuildInput = {};
        if (typeof meta.value.pagination?.limit === 'number') {
            statePagination.limit = meta.value.pagination.limit;
        }
        if (typeof meta.value.pagination?.offset === 'number') {
            statePagination.offset = meta.value.pagination.offset;
        }

        const chrome = mergeQueries(
            new Query({
                fields: interactiveNext.fields,
                relations: interactiveNext.relations,
                sorts: interactiveNext.sorts,
                pagination: inputQuery.pagination,
            }),
            new Query({ pagination: definePagination(statePagination) }),
            stripFilters(base),
        );

        return {
            query: new Query({
                fields: chrome.fields,
                relations: chrome.relations,
                sorts: chrome.sorts,
                pagination: chrome.pagination,
                filters: combineScopedFilters(interactiveNext.filters, base.filters),
            }),
            interactive: interactiveNext,
        };
    }

    // Never rejects: callers don't reliably handle rejections — most call
    // sites are fire-and-forget (the setup-time initial load below, template
    // refs, pagination footers) and the awaiting ones don't catch. During SSR
    // an unhandled rejection is fatal to the server process, so a failed load
    // emits `failed` and leaves the list empty instead of throwing.
    async function load(input: EntityListQueryInput<Entity<RECORD>> = {}) {
        if (!getMany || busy.value) return;

        busy.value = true;
        meta.value.busy = true;

        try {
            loadCompleted = false;

            const composed = composeQuery(input);

            const response = await getMany(composed.query);

            interactive = composed.interactive;
            query = composed.query;

            if (context.loadAll) {
                data.value.push(...response.data as RECORD[]);
            } else {
                data.value = response.data as RECORD[];
            }

            total.value = response.meta.total;

            meta.value.total = response.meta.total;
            meta.value.pagination = {
                limit: response.meta.limit,
                offset: response.meta.offset,
            };

            loadCompleted = true;
        } catch (e) {
            failed(isError(e) ? e : new Error('The entities could not be loaded.'));
            return;
        } finally {
            busy.value = false;
            meta.value.busy = false;
        }

        if (
            context.loadAll &&
            total.value > data.value.length
        ) {
            await load({ pagination: { offset: (meta.value.pagination?.offset ?? 0) + (meta.value.pagination?.limit ?? 0) } });
        }
    }

    // Identity of the request the initial load will make (entity type plus
    // serialized query), derived the same way on both sides so the server
    // render and the hydrating client agree on it. A key that cannot be
    // derived simply means no handoff, and the client loads as it always did.
    function resolveHandoff() : { key: string, initial: ComposedQuery } | undefined {
        if (!hydration) {
            return undefined;
        }

        try {
            const initial = composeQuery({});

            return {
                key: `authup:collection:${context.type}${buildQueryString(initial.query)}`,
                initial,
            };
        } catch {
            return undefined;
        }
    }

    // Three paths for the initial load: adopt a server-rendered snapshot,
    // load inside `onServerPrefetch` so the renderer awaits the data and can
    // hand it over, or fetch on the next microtask in the browser. Without a
    // hydration store the server render loads nothing at all, because the
    // response would be discarded when the render flushes.
    function setupInitialLoad() {
        const store = hydration;
        const handoff = resolveHandoff();

        // A server render only ever WRITES. It is the producer, so there is
        // nothing of its own to adopt, and reading here would mean rendering
        // whatever the store happens to hold — which is another request's rows
        // if a host ever backs the store with something outliving one request.
        // Keeping the server path write-only makes that leak impossible from
        // here, independently of how a host wires the store.
        if (typeof window === 'undefined') {
            if (!store || !handoff) {
                return;
            }

            onServerPrefetch(async () => {
                await load();

                // A failed render load leaves an empty list behind. Handing
                // that over would strand the client on it (an adopted
                // snapshot suppresses the load), so say nothing and let the
                // browser fetch for itself.
                if (!loadCompleted) {
                    return;
                }

                store.set(handoff.key, {
                    data: data.value,
                    total: total.value,
                    pagination: meta.value.pagination,
                });
            });

            return;
        }

        if (store && handoff) {
            const snapshot = store.get<EntityCollectionHydrationSnapshot<RECORD>>(handoff.key);
            if (snapshot) {
                // One-shot: navigating back to this list later must fetch
                // again instead of replaying the first render's rows.
                store.delete(handoff.key);

                data.value = snapshot.data;
                total.value = snapshot.total;

                meta.value.total = snapshot.total;
                if (snapshot.pagination) {
                    meta.value.pagination = snapshot.pagination;
                }

                interactive = handoff.initial.interactive;
                query = handoff.initial.query;

                return;
            }
        }

        Promise.resolve()
            .then(() => load());
    }

    const handlers = new ListHandlers<RECORD>(data, {
        created: (cbEntity) => {
            total.value++;

            if (context.onCreated) {
                context.onCreated(cbEntity, meta.value);
            }

            if (context.setup && typeof context.setup.emit === 'function') {
                context.setup.emit('created', cbEntity);
            }
        },
        deleted: (cbEntity) => {
            total.value--;

            if (context.setup && typeof context.setup.emit === 'function') {
                context.setup.emit('deleted', cbEntity);
            }
        },
        updated: (cbEntity) => {
            if (context.setup && typeof context.setup.emit === 'function') {
                context.setup.emit('updated', cbEntity);
            }
        },
    });


    function render(defaults?: EntityCollectionRenderOptions<RECORD>) : VNodeChild {
        let renderOptions : EntityCollectionRenderOptions<RECORD>;
        if (defaults) {
            renderOptions = mergeEntityCollectionRenderOptions(context.props, defaults);
        } else {
            renderOptions = context.props;
        }
        const headerOpt: ListHeaderOptions<RECORD> | undefined = boolableToObject(renderOptions.header || {});
        const footerOpt: ListFooterOptions<RECORD> | undefined = boolableToObject(renderOptions.footer || {});
        const noMoreOpt: ListNoMoreOptions<RECORD> | undefined = boolableToObject(renderOptions.noMore || {});
        const loadingOpt: ListLoadingOptions<RECORD> | undefined = boolableToObject(renderOptions.loading || {});

        const itemOpt = renderOptions.item ||
            (renderOptions.body && typeof renderOptions.body === 'object' ?
                renderOptions.body.item :
                undefined);

        const slots = context.setup.slots || {};

        // Each callback delegates to the `handlers` instance which already
        // updates total/data and emits the corresponding parent event —
        // adding a parallel `context.setup.emit(...)` here would fire each
        // event twice (silent data-corruption risk on entity mutations).
        const slotProps = (): ListSlotProps<RECORD> => ({
            data: data.value,
            busy: busy.value,
            total: total.value,
            load,
            meta: meta.value,
            created: (value: RECORD) => handlers.created(value),
            updated: (value: RECORD) => handlers.updated(value),
            deleted: (value: RECORD) => handlers.deleted(value),
        });

        const renderChrome = (
            slotName: EntityCollectionSlotName,
            opt: ListHeaderOptions<RECORD> | undefined,
            cssClass: string,
            withSlotProps = true,
        ): VNodeChild | null => {
            const slot = slots[slotName];
            if (slot) {
                return h(
                    opt?.tag ?? 'div',
                    { class: cssClass },
                    withSlotProps ? slot(slotProps()) : slot(undefined),
                );
            }
            if (opt?.content) {
                return h(opt.tag ?? 'div', { class: cssClass }, opt.content);
            }
            return null;
        };

        // <VCList> must receive `:data` / `:busy` / `:total` (or `:state`)
        // — without them, the list context publishes an empty data ref,
        // and child <VCListBody> / <VCListEmpty> short-circuit
        // (return null) regardless of what slot vnodes the renderer
        // emits. Symptom: junction list views (client-roles,
        // client-permissions, …) render the header + footer but the
        // body is silently dropped. See @vuecs/list source —
        // `useList()` reads from the parent VCList's provided state,
        // not from the children passed to VCListBody.
        const listProps = {
            data: data.value,
            busy: busy.value,
            total: total.value,
            meta: meta.value,
        };

        // DEFAULT slot — if provided, takes over the entire list contents
        // (legacy buildList contract). Used as the escape hatch for
        // consumers that want full control over the list body.
        const defaultSlot = slots[EntityCollectionSlotName.DEFAULT];
        if (defaultSlot) {
            return h(VCList, listProps, () => defaultSlot(slotProps()));
        }

        return h(VCList, listProps, () => {
            const children: VNodeChild[] = [];

            const headerVNode = renderOptions.header !== false ?
                renderChrome(EntityCollectionSlotName.HEADER, headerOpt, 'vc-list-header') :
                null;
            if (headerVNode) children.push(headerVNode);

            // BODY slot — if provided, the consumer renders the full body
            // (e.g. a `<VCTable>` with `:columns` driving auto-render) and
            // per-item rendering is skipped. Otherwise fall back to
            // <VCListBody> + per-item <VCListItem>.
            const bodySlot = slots[EntityCollectionSlotName.BODY];
            if (bodySlot) {
                children.push(bodySlot(slotProps()));
            } else {
                children.push(h(VCListBody, {}, () => {
                    const renderLoadingBand = (overlay: boolean) => {
                        if (renderOptions.loading === false) return null;
                        const slot = slots[EntityCollectionSlotName.LOADING];
                        if (slot) return slot(undefined);
                        if (loadingOpt?.content) {
                            return h(loadingOpt.tag ?? 'div', { class: 'vc-list-loading' }, loadingOpt.content);
                        }
                        return h(VCListLoading, { overlay });
                    };

                    // First-load: data is empty AND busy → show loading in place.
                    if (busy.value && data.value.length === 0) {
                        return renderLoadingBand(false);
                    }

                    if (data.value.length === 0) {
                        return h(VCListEmpty);
                    }

                    // Refresh path: data shown AND busy → overlay loading on top
                    // of existing rows so consumers still see refresh feedback
                    // (the old buildList rendered an overlay here; without it
                    // there's no signal that an in-flight reload is happening).
                    const rows = data.value.map((item, index) => {
                    // Same single-emit contract as `slotProps()`: handlers
                    // already emits, so we delegate and don't double-fire.
                        const itemSlotProps: ListItemSlotProps<RECORD> = {
                            data: item,
                            index,
                            busy: busy.value,
                            updated: (next: RECORD) => handlers.updated(next),
                            deleted: (next: RECORD) => handlers.deleted(next),
                        };
                        return h(VCListItem, { key: item.id ?? index }, () => {
                            const itemSlot = slots[EntityCollectionSlotName.ITEM];
                            const itemActionsSlot = slots[EntityCollectionSlotName.ITEM_ACTIONS];
                            const itemActionsExtraSlot = slots[EntityCollectionSlotName.ITEM_ACTIONS_EXTRA];

                            let body: VNodeChild;
                            if (itemSlot) {
                                body = itemSlot(itemSlotProps);
                            } else if (itemOpt?.content) {
                                body = typeof itemOpt.content === 'function' ?
                                    itemOpt.content(item, itemSlotProps) :
                                    itemOpt.content;
                            } else {
                                body = h('span', String((hasOwnProperty(item, 'name') ? item.name : undefined) ?? item.id ?? ''));
                            }

                            if (!itemActionsSlot && !itemActionsExtraSlot) {
                                return body;
                            }

                            // Push actions to the right edge of the row.
                            // The legacy `@vuecs/list-controls` 2.x buildList
                            // styled actions via the bootstrap theme's
                            // `vc-list-item-actions` rule (margin-left auto);
                            // the new `@vuecs/list` 1.x doesn't ship that
                            // CSS. Without `ms-auto`, both body and toggle
                            // stack flush-left inside the flex VCListItem
                            // and the toggle looks like a continuation of
                            // the row label. Bootstrap `ms-auto` keeps the
                            // label left-aligned and floats the actions to
                            // the right — matches every junction picker
                            // (client/user/policy roles) consumer.
                            const actionsNodes: VNodeChild[] = [];
                            if (itemActionsSlot) {
                                actionsNodes.push(itemActionsSlot(itemSlotProps));
                            }
                            if (itemActionsExtraSlot) {
                                actionsNodes.push(itemActionsExtraSlot(itemSlotProps));
                            }
                            return [
                                body,
                                h(
                                    'div',
                                    { class: 'vc-list-item-actions ms-auto d-flex align-items-center gap-1' },
                                    actionsNodes,
                                ),
                            ];
                        });
                    });

                    if (busy.value) {
                        return [rows, renderLoadingBand(true)];
                    }
                    return rows;
                }));
            }

            // "No more" — empty-list indicator. Matches legacy
            // `@vuecs/list-controls@2.x` `buildListNoMore` semantics:
            // rendered ONLY when the list is empty (`total === 0`) and
            // not currently loading. Entity wrappers (AIdentityProviders,
            // AClients, …) pass `noMore: { content: translation.value }`
            // expecting it to fire as the "no items available" message;
            // it should NOT fire when the list has items (that would
            // produce a stray "no more entries" tag below a populated
            // list — pre-PR behaviour did not do that). When a custom
            // <template #body> renders the data, noMore is the only
            // empty-state indicator the renderer emits; the default
            // (no-body-slot) path additionally renders <VCListEmpty>.
            if (
                renderOptions.noMore !== false &&
                !busy.value &&
                total.value === 0
            ) {
                const noMoreVNode = renderChrome(EntityCollectionSlotName.NO_MORE, noMoreOpt, 'vc-list-no-more', false);
                if (noMoreVNode) children.push(noMoreVNode);
            }

            const footerVNode = renderOptions.footer !== false ?
                renderChrome(EntityCollectionSlotName.FOOTER, footerOpt, 'vc-list-footer') :
                null;
            if (footerVNode) children.push(footerVNode);

            return h(Fragment, children);
        });
    }

    context.setup.expose({
        handleCreated: (data: RECORD) => handlers.created(data),
        handleDeleted: (data: RECORD) => handlers.deleted(data),
        handleUpdated: (data: RECORD) => handlers.updated(data),
        load,
        data,
    });

    let loadOnSetup = true;
    const propLoadOnSetup = unref(context.props.loadOnSetup);
    if (typeof propLoadOnSetup === 'boolean') {
        loadOnSetup = propLoadOnSetup;
    }

    if (loadOnSetup) {
        setupInitialLoad();
    }

    if (
        typeof context.socket !== 'boolean' ||
        typeof context.socket === 'undefined' ||
        context.socket
    ) {
        const socketContext : EntitySocketManagerCreateContext<TYPE, RECORD> = {
            type: context.type,
            ...(isObject(context.socket) ? context.socket : {}),
        };

        socketContext.onCreated = (entity) => {
            const isSorted = query &&
                isQuerySortedDescByDate(query.sorts) &&
                meta.value?.pagination?.offset === 0;

            if (isSorted || total.value < (meta.value?.pagination?.limit ?? 0)) {
                handlers.created(entity);
            }
        };
        socketContext.onDeleted = (entity: RECORD) => {
            handlers.deleted(entity);
        };
        socketContext.onUpdated = (entity: RECORD) => {
            handlers.updated(entity);
        };
        socketContext.realmId = realmId;

        defineEntitySocketManager(socketContext);
    }

    return {
        data,
        busy,
        meta,
        total,

        handleCreated: (entity: RECORD) => {
            handlers.updated(entity);
        },
        handleDeleted: (entity: RECORD) => {
            handlers.deleted(entity);
        },
        handleUpdated: (entity: RECORD) => {
            handlers.updated(entity);
        },

        render,
        load,
    };
}

export function defineEntityCollectionManager<
    A extends keyof EntityTypeMap,
>(
    context: EntityCollectionManagerCreateContext<A, EntityTypeMap[A]>,
) : EntityCollectionManager<EntityTypeMap[A]> {
    return create(context);
}
