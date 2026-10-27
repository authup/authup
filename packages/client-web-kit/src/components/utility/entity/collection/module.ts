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
    defineFilters,
    definePagination,
    isQuery,
    mergeQueries,
} from '@rapiq/core';
import { defineDataCollection } from '@vuecs/data';
import type { DataCollectionLoadResult, DataCollectionSnapshot } from '@vuecs/data';
import type { EntityListQueryInput } from '../../../../core';
import type { VNodeChild } from 'vue';
import {
    Fragment,
    computed,
    h,
    isRef,
    onServerPrefetch,
    unref,
} from 'vue';
import { EntityCollectionSlotName } from './constants';
import { isObject } from 'smob';
import { boolableToObject } from '../../../../utils';
import { injectHTTPClient } from '../../../../core/http-client';
import { injectHydrationStore } from '../../../../core/hydration';
import { useEntityNameSearch, useEntityNameTranslator } from '../../../../core/translator';
import type { EntityNamed } from '../../../../core/translator';
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
    buildEntitySearchCondition,
    mergeEntityCollectionRenderOptions,
} from './utils';
import { isError } from '@authup/errors';

type Entity<A> = A extends Record<string, any> ? A : never;

type ComposedQuery = {
    query: Query,
    interactive: Query
};

function stripPagination(input: IQuery) : Query {
    return new Query({
        fields: input.fields,
        filters: input.filters,
        relations: input.relations,
        sorts: input.sorts,
    });
}

function create<
    TYPE extends keyof EntityTypeMap,
    RECORD extends EntityTypeMap[TYPE],
>(
    context: EntityCollectionManagerCreateContext<TYPE, RECORD>,
) : EntityCollectionManager<RECORD> {
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
    const translateEntityName = useEntityNameTranslator();
    const searchEntityNames = useEntityNameSearch();

    const domainAPI = pickEntityAPI<TYPE, Entity<RECORD>>(client, context.type);
    // Captured bound, so the load fn's guard survives the query
    // composition between guard and call (property narrowing does not).
    const getMany = domainAPI?.getMany ?
        domainAPI.getMany.bind(domainAPI) :
        undefined;

    // Last composed query (IR) — read by the socket handler's sort check.
    let query : IQuery | undefined;

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
            return mergeQueries(propsQuery, contextQuery);
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
    /**
     * Compares two filter trees by the wire form rapiq itself emits, so
     * structurally equal conditions compare equal without this module
     * knowing the IR's shape.
     */
    function serializeFilters(source: IQuery) : string {
        return buildQueryString(new Query({ filters: source.filters }));
    }

    function composeQuery(
        input: EntityListQueryInput<Entity<RECORD>>,
        pagination: PaginationBuildInput | undefined,
    ) : ComposedQuery {
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
                // (anything richer), else a substring match over the entity's
                // searchable fields.
                const transformed = context.queryFilters ?
                    context.queryFilters(input.filters.name) :
                    buildEntitySearchCondition(
                        context.type,
                        input.filters.name,
                        searchEntityNames(context.type, input.filters.name),
                    );
                filtersOverride = defineFilters(
                    transformed as FiltersBuildInput | ICondition,
                );
            }

            // Per-parameter replace: a parameter present on the input
            // supersedes the retained interactive value, an absent one
            // keeps it (a pagination-only load keeps the search).
            //
            // Sorts accept both spellings: rapiq 2.1.0 made `sorts` the
            // canonical build-input key and kept `sort` as a deprecated
            // alias, so checking only one silently drops a load carrying
            // the other. They are matched on a DEFINED value rather than
            // key presence (the `in` the siblings use), because rapiq
            // documents the spread migration wrapper
            // `{ sorts: props.sorts, sort: props.sort }` as safe: it
            // carries both keys as `undefined`, which `in` reads as
            // "supplied" and would wipe the retained sorts. Supplying
            // both with values throws KEY_AMBIGUOUS at desugaring above.
            const sortsSupplied = typeof input.sorts !== 'undefined' ||
                typeof input.sort !== 'undefined';

            interactiveNext = new Query({
                fields: 'fields' in input ? inputQuery.fields : interactive?.fields,
                filters: filtersOverride ??
                    ('filters' in input ? inputQuery.filters : interactive?.filters),
                relations: 'relations' in input ? inputQuery.relations : interactive?.relations,
                sorts: sortsSupplied ? inputQuery.sorts : interactive?.sorts,
            });
        }

        const base = resolveBaseQuery();

        // A load that CHANGES the filters must not inherit the retained
        // offset. The freshly narrowed set is shorter, so page 2+ asks for
        // rows past its end and renders an empty list (issue #3443). Every
        // narrowing control used to reset the offset itself, which made
        // correctness a matter of caller discipline and left the second one
        // to forget it; the manager owns the retained pagination, so it
        // owns this. The very first load is exempt (nothing changed yet),
        // and an input carrying its own pagination still wins by merge
        // precedence below.
        const filtersChanged = typeof interactive !== 'undefined' &&
            serializeFilters(interactiveNext) !== serializeFilters(interactive);

        const statePagination : PaginationBuildInput = {};
        if (typeof pagination?.limit === 'number') {
            statePagination.limit = pagination.limit;
        }
        if (typeof pagination?.offset === 'number') {
            statePagination.offset = filtersChanged ? 0 : pagination.offset;
        }

        return {
            query: mergeQueries(
                new Query({
                    fields: interactiveNext.fields,
                    filters: interactiveNext.filters,
                    relations: interactiveNext.relations,
                    sorts: interactiveNext.sorts,
                    pagination: inputQuery.pagination,
                }),
                new Query({ pagination: definePagination(statePagination) }),
                base,
            ),
            interactive: interactiveNext,
        };
    }

    // Pagination state before anything was loaded. Also what the hydration
    // key is derived from, so it must match the source's initial meta.
    const initialPagination : PaginationBuildInput = { limit: 10 };

    // The composed query of the load in flight, handed from `load` to the
    // source's loader. The source invokes its loader synchronously from
    // `source.load()`, so the value read there is always this call's.
    let pending : { query: ComposedQuery, sequence: number } | undefined;

    // Monotonic per `load` call, mirroring the source's own latest-wins
    // token: only the latest call may commit interactive state or report
    // its failure.
    let sequence = 0;

    // Walks every page when `loadAll` is set: the source replaces its data
    // wholesale, so the concatenation is assembled here rather than appended.
    async function fetchAll(composed: Query) : Promise<DataCollectionLoadResult<RECORD, ListMeta>> {
        if (!getMany) {
            return { data: [] };
        }

        let response = await getMany(composed);
        const rows = [...response.data] as RECORD[];

        while (
            context.loadAll &&
            response.data.length > 0 &&
            response.meta.total > rows.length
        ) {
            response = await getMany(mergeQueries(
                new Query({
                    pagination: definePagination({
                        limit: response.meta.limit,
                        // Advanced by the rows actually returned, so a short
                        // page can neither skip rows nor repeat the request.
                        offset: (response.meta.offset ?? 0) + response.data.length,
                    }),
                }),
                composed,
            ));

            rows.push(...response.data as RECORD[]);
        }

        return {
            data: rows,
            total: response.meta.total,
            meta: {
                pagination: {
                    limit: response.meta.limit,
                    offset: response.meta.offset,
                },
            },
        };
    }

    async function loadPending() : Promise<DataCollectionLoadResult<RECORD, ListMeta>> {
        const current = pending;
        pending = undefined;
        if (!current) {
            return { data: [] };
        }

        const result = await fetchAll(current.query.query);

        // Committed only once the request succeeded, and only by the latest
        // call: a superseded response is dropped by the source, so its
        // search must not become the retained one either.
        if (current.sequence === sequence) {
            interactive = current.query.interactive;
            query = current.query.query;
        }

        return result;
    }

    // Socket and slot mutations arriving while a load is in flight wait for
    // it to settle, so whether they applied can be read off the settled
    // data instead of off rows the response is about to replace.
    let loading = 0;
    let deferred : (() => void)[] = [];

    function drainDeferred() {
        const operations = deferred;
        deferred = [];
        for (const operation of operations) {
            operation();
        }
    }

    function whenIdle(operation: () => void) {
        if (loading > 0) {
            deferred.push(operation);
            return;
        }

        operation();
    }

    // Snapshot handed over by the server render, adopted at most once.
    let adopted : DataCollectionSnapshot<RECORD, ListMeta> | undefined;

    const isServer = typeof window === 'undefined';

    let loadOnSetup = true;
    const propLoadOnSetup = unref(context.props.loadOnSetup);
    if (typeof propLoadOnSetup === 'boolean') {
        loadOnSetup = propLoadOnSetup;
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
            const initial = composeQuery({}, initialPagination);

            return {
                key: `authup:collection:${context.type}${buildQueryString(initial.query)}`,
                initial,
            };
        } catch {
            return undefined;
        }
    }

    const handoff = loadOnSetup ? resolveHandoff() : undefined;

    // The client consumes the server's snapshot on read: one-shot, so
    // navigating back to this list later fetches again instead of replaying
    // the first render's rows. A server render only ever WRITES. It is the
    // producer, so there is nothing of its own to adopt, and reading here
    // would mean rendering whatever the store happens to hold — which is
    // another request's rows if a host ever backs the store with something
    // outliving one request. Keeping the server path write-only makes that
    // leak impossible from here, independently of how a host wires the store.
    function popSnapshot() : DataCollectionSnapshot<RECORD, ListMeta> | undefined {
        if (isServer || !hydration || !handoff) {
            return undefined;
        }

        const snapshot = hydration.get<EntityCollectionHydrationSnapshot<RECORD>>(handoff.key);
        if (!snapshot) {
            return undefined;
        }

        hydration.delete(handoff.key);

        adopted = {
            data: snapshot.data,
            total: snapshot.total,
            meta: { pagination: snapshot.pagination ?? initialPagination },
        };

        return adopted;
    }

    const source = defineDataCollection<RECORD, ListMeta>({
        load: loadPending,
        initialMeta: { pagination: initialPagination },
        autoLoad: false,
        hydrate: popSnapshot,
        dedupCreated: true,
        mergeOnUpdated: true,
        filterDeleted: true,
    });

    const {
        data, 
        busy, 
        total, 
    } = source;

    // The pagination UI reads total and busy off the meta object, so the
    // exposed meta folds the source's own state into the bag it keeps.
    const meta = computed<ListMeta>(() => ({
        ...source.meta,
        total: total.value,
        busy: busy.value,
    }));

    // Never rejects: callers don't reliably handle rejections — most call
    // sites are fire-and-forget (the setup-time initial load below, template
    // refs, pagination footers) and the awaiting ones don't catch. During SSR
    // an unhandled rejection is fatal to the server process, so a failed load
    // emits `failed` and leaves the list as it was instead of throwing.
    // A load issued while another is in flight supersedes it.
    async function load(input: EntityListQueryInput<Entity<RECORD>> = {}) {
        if (!getMany) return;

        // Composed before the sequence moves: a composition that throws
        // issues no request, so it must not mark the load already in flight
        // as superseded, or its rows would land without the query they
        // answer.
        let composed : ComposedQuery;
        try {
            composed = composeQuery(input, source.meta.pagination);
        } catch (e) {
            failed(isError(e) ? e : new Error('The entities could not be loaded.'));
            return;
        }

        sequence++;
        const current = sequence;
        pending = { query: composed, sequence: current };

        loading++;
        try {
            await source.load();
        } finally {
            loading--;
        }

        if (loading === 0) {
            drainDeferred();
        }

        if (current === sequence && source.error.value) {
            const { value } = source.error;
            failed(isError(value) ? value : new Error('The entities could not be loaded.'));
        }
    }

    // Three paths for the initial load: adopt a server-rendered snapshot
    // (above, through the source's `hydrate`), load inside
    // `onServerPrefetch` so the renderer awaits the data and can hand it
    // over, or fetch on the next microtask in the browser. Without a
    // hydration store the server render loads nothing at all, because the
    // response would be discarded when the render flushes.
    function setupInitialLoad() {
        if (isServer) {
            const store = hydration;
            if (!store || !handoff) {
                return;
            }

            onServerPrefetch(async () => {
                await load();

                // A failed render load leaves an empty list behind. Handing
                // that over would strand the client on it (an adopted
                // snapshot suppresses the load), so say nothing and let the
                // browser fetch for itself.
                if (source.error.value) {
                    return;
                }

                const snapshot = source.dehydrate();
                const value : EntityCollectionHydrationSnapshot<RECORD> = {
                    data: snapshot.data,
                    total: total.value,
                    pagination: snapshot.meta.pagination,
                };
                store.set(handoff.key, value);
            });

            return;
        }

        if (adopted && handoff) {
            interactive = handoff.initial.interactive;
            query = handoff.initial.query;

            return;
        }

        Promise.resolve()
            .then(() => load());
    }

    // The mutators apply only what changes the list: a create of a row
    // already present, an update or delete of a row that is not, are
    // no-ops. Each emit fires only when its mutation applied.
    function created(entity: RECORD) {
        whenIdle(() => {
            if (source.findIndex(entity) !== -1) {
                return;
            }

            source.create(entity);

            if (context.onCreated) {
                context.onCreated(entity, meta.value);
            }

            if (context.setup && typeof context.setup.emit === 'function') {
                context.setup.emit('created', entity);
            }
        });
    }

    function updated(entity: RECORD) {
        whenIdle(() => {
            if (source.findIndex(entity) === -1) {
                return;
            }

            source.update(entity);

            const next = data.value[source.findIndex(entity)];
            if (next && context.setup && typeof context.setup.emit === 'function') {
                context.setup.emit('updated', next);
            }
        });
    }

    function deleted(entity: RECORD) {
        whenIdle(() => {
            const index = source.findIndex(entity);
            const previous = index === -1 ? undefined : data.value[index];
            if (!previous) {
                return;
            }

            source.delete(entity);

            if (context.setup && typeof context.setup.emit === 'function') {
                context.setup.emit('deleted', previous);
            }
        });
    }

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

        // Each callback delegates to the source mutators, which already
        // update total/data and emit the corresponding parent event —
        // adding a parallel `context.setup.emit(...)` here would fire each
        // event twice (silent data-corruption risk on entity mutations).
        const slotProps = (): ListSlotProps<RECORD> => ({
            data: data.value,
            busy: busy.value,
            total: total.value,
            load,
            meta: meta.value,
            created: (value: RECORD) => created(value),
            updated: (value: RECORD) => updated(value),
            deleted: (value: RECORD) => deleted(value),
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
                    // Same single-emit contract as `slotProps()`: the mutators
                    // already emits, so we delegate and don't double-fire.
                        const itemSlotProps: ListItemSlotProps<RECORD> = {
                            data: item,
                            index,
                            busy: busy.value,
                            updated: (next: RECORD) => updated(next),
                            deleted: (next: RECORD) => deleted(next),
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
                                const name = hasOwnProperty(item, 'name') && typeof item.name === 'string' ?
                                    item.name :
                                    undefined;
                                if (name) {
                                    const label = translateEntityName(context.type, item as EntityNamed);
                                    body = label === name ?
                                        h('span', name) :
                                        h('span', [label, h('small', { class: 'block text-fg-muted' }, name)]);
                                } else {
                                    body = h('span', String(item.id ?? ''));
                                }
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
        handleCreated: (entity: RECORD) => created(entity),
        handleDeleted: (entity: RECORD) => deleted(entity),
        handleUpdated: (entity: RECORD) => updated(entity),
        load,
        data,
        // A load issued while another is in flight supersedes it, but a
        // caller that narrows the base query still waits for idle before
        // asking, so it can tell its own load from the one already running.
        busy,
    });

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
                created(entity);
            }
        };
        socketContext.onDeleted = (entity: RECORD) => {
            deleted(entity);
        };
        socketContext.onUpdated = (entity: RECORD) => {
            updated(entity);
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
            created(entity);
        },
        handleDeleted: (entity: RECORD) => {
            deleted(entity);
        },
        handleUpdated: (entity: RECORD) => {
            updated(entity);
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
