/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@authup/kit';
import type { DomainAPI } from '@authup/core-http-kit';
import type { DomainTypeMap } from '@authup/core-kit';
import type {
    ListFooterBuildOptionsInput, ListHeaderBuildOptionsInput,
} from '@vuecs/list-controls';
import {
    buildList,
} from '@vuecs/list-controls';
import type { BuildInput, FiltersBuildInput } from 'rapiq';
import type { Ref, VNodeChild } from 'vue';
import {
    computed, isRef,
    ref, unref,
} from 'vue';
import { createMerger, isObject } from 'smob';
import { boolableToObject } from '../../../utils';
import { injectHTTPClient } from '../../http-client';
import { createResourceSocketManager } from '../socket';
import type { ResourceSocketManagerCreateContext } from '../socket';
import { isQuerySortedDescByDate } from '../../query';
import type {
    ListMeta,
    ResourceCollectionManager,
    ResourceCollectionManagerCreateContext,
    ResourceCollectionRenderOptions,
} from './types';
import {
    buildListCreatedHandler,
    buildListDeletedHandler,
    buildListUpdatedHandler,
    mergeListOptions,
} from './utils';

const merger = createMerger({
    array: false,
    inPlace: false,
    priority: 'left',
});

type Entity<A> = A extends Record<string, any> ? A : never;

function create<
    TYPE extends keyof DomainTypeMap,
    RECORD extends DomainTypeMap[TYPE],
>(
    context: ResourceCollectionManagerCreateContext<TYPE, RECORD>,
) : ResourceCollectionManager<RECORD> {
    const data : Ref<RECORD[]> = ref([]);
    const busy = ref(false);
    const total = ref(0);
    const meta = ref<ListMeta<RECORD>>({
        pagination: {
            limit: 10,
        },
    }) as Ref<ListMeta<RECORD>>;

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

    let domainAPI : DomainAPI<Entity<RECORD>> | undefined;
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

    const handleCreated = buildListCreatedHandler(data, (cbEntity) => {
        total.value++;

        if (context.onCreated) {
            context.onCreated(cbEntity, meta.value);
        }
    });

    const handleDeleted = buildListDeletedHandler(data, () => {
        total.value--;
    });
    const handleUpdated = buildListUpdatedHandler(data);

    function render(defaults?: ResourceCollectionRenderOptions<RECORD>) : VNodeChild {
        let renderOptions : ResourceCollectionRenderOptions<RECORD>;
        if (defaults) {
            renderOptions = mergeListOptions(context.props, defaults);
        } else {
            renderOptions = context.props;
        }
        const header : ListHeaderBuildOptionsInput<RECORD> = boolableToObject(renderOptions.header || {});
        const footer : ListFooterBuildOptionsInput<RECORD> = boolableToObject(renderOptions.footer || {});

        if (renderOptions.item) {
            if (
                typeof renderOptions.body === 'undefined' ||
                typeof renderOptions.body === 'boolean'
            ) {
                renderOptions.body = { item: renderOptions.item };
            } else {
                renderOptions.body.item = renderOptions.item;
            }
        }

        return buildList<RECORD, ListMeta<RECORD>>({
            footer,
            header,
            noMore: renderOptions.noMore,
            body: renderOptions.body,
            loading: renderOptions.loading,
            total: total.value,
            load,
            busy: busy.value,
            data: data.value as Entity<RECORD>[],
            meta: meta.value,
            onCreated: (value: RECORD) => {
                if (context.setup.emit) {
                    context.setup.emit('created', value);
                }

                handleCreated(value);
            },
            onDeleted: (value: RECORD) => {
                if (context.setup.emit) {
                    context.setup.emit('deleted', value);
                }

                handleDeleted(value);
            },
            onUpdated: (value: RECORD) => {
                if (context.setup.emit) {
                    context.setup.emit('updated', value);
                }

                handleUpdated(value);
            },
            slotItems: context.setup.slots || {},
        });
    }

    context.setup.expose({
        handleCreated,
        handleDeleted,
        handleUpdated,
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
        const socketContext : ResourceSocketManagerCreateContext<TYPE, RECORD> = {
            type: context.type,
            ...(isObject(context.socket) ? context.socket : {}),
        };

        socketContext.onCreated = (entity) => {
            const isSorted = query &&
                query.sort &&
                isQuerySortedDescByDate(query.sort) &&
                meta.value?.pagination?.offset === 0;

            if (isSorted || total.value < (meta.value?.pagination?.limit ?? 0)) {
                handleCreated(entity);
            }
        };
        socketContext.onDeleted = (entity: RECORD) => {
            handleDeleted(entity);
        };
        socketContext.onUpdated = (entity: RECORD) => {
            handleDeleted(entity);
        };
        socketContext.realmId = realmId;

        createResourceSocketManager(socketContext);
    }

    return {
        data,
        busy,
        meta,
        total,

        handleCreated,
        handleUpdated,
        handleDeleted,

        render,
        load,
    };
}

export function createResourceCollectionManager<
    A extends keyof DomainTypeMap,
>(
    context: ResourceCollectionManagerCreateContext<A, DomainTypeMap[A]>,
) : ResourceCollectionManager<DomainTypeMap[A]> {
    return create(context);
}
