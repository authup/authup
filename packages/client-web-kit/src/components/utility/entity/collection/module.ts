/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@authup/kit';
import type { IEntityAPI } from '@authup/core-http-kit';
import type { EntityTypeMap } from '@authup/core-kit';
import {
    VCList,
    VCListBody,
    VCListEmpty,
    VCListItem,
    VCListLoading,
} from '@vuecs/list';
import type { BuildInput, FiltersBuildInput } from 'rapiq';
import type { Ref, VNodeChild } from 'vue';
import {
    Fragment,
    computed,
    h,
    isRef,
    ref,
    unref,
} from 'vue';
import { EntityCollectionSlotName } from './constants';
import { createMerger, isObject } from 'smob';
import { boolableToObject } from '../../../../utils';
import { injectHTTPClient } from '../../../../core/http-client';
import { defineEntitySocketManager } from '../socket';
import type { EntitySocketManagerCreateContext } from '../socket';
import { isQuerySortedDescByDate } from '../../../../core/query';
import type {
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

const merger = createMerger({
    array: false,
    inPlace: false,
    priority: 'left',
});

type Entity<A> = A extends Record<string, any> ? A : never;

function create<
    TYPE extends keyof EntityTypeMap,
    RECORD extends EntityTypeMap[TYPE],
>(
    context: EntityCollectionManagerCreateContext<TYPE, RECORD>,
) : EntityCollectionManager<RECORD> {
    const data : Ref<RECORD[]> = ref([]);
    const busy = ref(false);
    const total = ref(0);
    const meta = ref<ListMeta<RECORD>>({ pagination: { limit: 10 } }) as Ref<ListMeta<RECORD>>;

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

    let domainAPI : IEntityAPI<Entity<RECORD>> | undefined;
    if (hasOwnProperty(client, context.type)) {
        domainAPI = client[context.type] as any;
    }

    let query : BuildInput<Entity<RECORD>> | undefined;

    async function load(input: ListMeta<RECORD> = {}) {
        if (!domainAPI || busy.value) return;

        busy.value = true;
        meta.value.busy = true;

        try {
            let filters : FiltersBuildInput<Entity<RECORD>> | undefined;
            if (
                context.queryFilters &&
                input.filters &&
                hasOwnProperty(input.filters, 'name') &&
                typeof input.filters.name === 'string'
            ) {
                // todo: queryFilters should customize full filters object!
                filters = context.queryFilters(input.filters.name) as FiltersBuildInput<Entity<RECORD>>;
            }

            query = undefined;
            if (context.query) {
                if (typeof context.query === 'function') {
                    query = context.query();
                } else {
                    query = context.query;
                }
            }

            if (context.props.query) {
                if (query) {
                    query = merger({}, context.props.query, query);
                } else {
                    query = context.props.query;
                }
            }

            const nextQuery : ListMeta<RECORD> = merger(
                (filters ? { filters } : {}),
                input || {},
                {
                    pagination: {
                        limit: meta.value.pagination?.limit,
                        offset: meta.value.pagination?.offset,
                    },
                },
                query || {},
            );

            const response = await domainAPI.getMany(
                nextQuery as BuildInput<Entity<RECORD>>,
            );

            meta.value = nextQuery;

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
        } finally {
            busy.value = false;
            meta.value.busy = false;
        }

        if (
            context.loadAll &&
            total.value > data.value.length
        ) {
            await load({
                ...meta.value,
                pagination: {
                    ...meta.value.pagination,
                    offset: (meta.value.pagination?.offset ?? 0) + (meta.value.pagination?.limit ?? 0),
                },
            });
        }
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
        const slotProps = (): ListSlotProps<RECORD, ListMeta<RECORD>> => ({
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
                        return h(VCListItem, { key: (item as any).id ?? index }, () => {
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
                                body = h('span', String((item as any).name ?? (item as any).id ?? ''));
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
                            // (client/user/robot/policy roles) consumer.
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
            // ARobots, …) pass `noMore: { content: translation.value }`
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
        Promise.resolve()
            .then(() => load());
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
                query.sort &&
                isQuerySortedDescByDate(query.sort) &&
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
