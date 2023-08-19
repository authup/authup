/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@authup/core';
import type { DomainAPI, DomainEntity, DomainType } from '@authup/core';
import type {
    ListFooterBuildOptionsInput, ListHeaderBuildOptionsInput,
} from '@vue-layout/list-controls';
import {
    buildList,
} from '@vue-layout/list-controls';
import type { BuildInput, FiltersBuildInput, PaginationBuildInput } from 'rapiq';
import type { Ref, VNodeChild } from 'vue';
import {
    computed, isRef,
    ref, unref,
} from 'vue';
import { isObject, merge } from 'smob';
import { boolableToObject } from '../../utils';
import { injectAPIClient } from '../api-client';
import { createEntitySocket } from '../entity-socket';
import type { EntitySocketContext } from '../entity-socket';
import { isQuerySortedDescByDate } from '../query';
import type {
    List,
    ListCreateContext,
    ListQuery,
    ListRenderOptions,
} from './type';
import {
    buildListCreatedHandler,
    buildListDeletedHandler,
    buildListUpdatedHandler,
    mergeListOptions,
} from './utils';

type Entity<T> = T extends Record<string, any> ? T : never;
type DomainTypeInfer<T> = T extends DomainEntity<infer U> ? U extends `${DomainType}` ? U : never : never;

export function createEntityList<
    A extends DomainTypeInfer<DomainEntity<any>>,
    T = DomainEntity<A>,
>(
    context: ListCreateContext<A, T>,
) : List<T> {
    const data : Ref<T[]> = ref([]);
    const busy = ref(false);
    const total = ref(0);
    const meta = ref({
        pagination: {
            limit: 10,
        },
    }) as Ref<ListQuery<T>>;

    const setMetaPaginationProperty = <P extends keyof PaginationBuildInput>(
        prop: P,
        value: PaginationBuildInput[P],
    ) => {
        if (meta.value.pagination) {
            meta.value.pagination[prop] = value;
        } else {
            meta.value.pagination = {
                [prop]: value,
            };
        }
    };

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

    const client = injectAPIClient();

    let domainAPI : DomainAPI<Entity<T>> | undefined;
    if (hasOwnProperty(client, context.type)) {
        domainAPI = client[context.type] as any;
    }

    let query : BuildInput<Entity<T>> | undefined;

    async function load(targetMeta: ListQuery<T> = {}) {
        if (!domainAPI || busy.value) return;

        busy.value = true;

        try {
            let filters : FiltersBuildInput<Entity<T>> | undefined;
            if (
                context.queryFilters &&
                targetMeta.filters &&
                hasOwnProperty(targetMeta.filters, 'name') &&
                typeof targetMeta.filters.name === 'string'
            ) {
                filters = context.queryFilters(targetMeta.filters.name) as FiltersBuildInput<Entity<T>>;
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
                    query = merge({}, context.props.query, query);
                } else {
                    query = context.props.query;
                }
            }

            const response = await domainAPI.getMany(merge(
                (filters ? { filters } : {}),
                targetMeta || {},
                {
                    pagination: {
                        limit: meta.value.pagination?.limit,
                        offset: meta.value.pagination?.offset,
                    },
                },
                query || {},
            ));

            if (context.loadAll) {
                data.value.push(...response.data as T[]);
            } else {
                data.value = response.data as T[];
            }

            total.value = response.meta.total;

            setMetaPaginationProperty('limit', response.meta.limit);
            setMetaPaginationProperty('offset', response.meta.offset);
        } finally {
            busy.value = false;
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
        total.value--;

        if (context.onCreated) {
            context.onCreated(cbEntity, meta.value);
        }
    });
    const handleDeleted = buildListDeletedHandler(data, () => {
        total.value--;
    });
    const handleUpdated = buildListUpdatedHandler(data);

    let options : ListRenderOptions<T> = context.props;

    const setDefaults = (defaults: ListRenderOptions<T>) => {
        options = mergeListOptions(context.props, defaults);
    };

    function render() : VNodeChild {
        const header : ListHeaderBuildOptionsInput<T> = boolableToObject(options.header || {});
        const footer : ListFooterBuildOptionsInput<T> = boolableToObject(options.footer || {});

        if (options.item) {
            if (
                typeof options.body === 'undefined' ||
                typeof options.body === 'boolean'
            ) {
                options.body = { item: options.item };
            } else {
                options.body.item = options.item;
            }
        }

        return buildList<T, ListQuery<T>>({
            footer,
            header,
            noMore: options.noMore,
            body: options.body,
            loading: options.loading,
            total: total.value,
            load,
            busy: busy.value,
            data: data.value as Entity<T>[],
            meta: meta.value,
            onDeleted(value: T) {
                if (context.setup.emit) {
                    context.setup.emit('deleted', value);
                }
            },
            onUpdated(value: T) {
                if (context.setup.emit) {
                    context.setup.emit('updated', value);
                }
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
        const socketContext : EntitySocketContext<A, T> = {
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
        socketContext.onDeleted = (entity: T) => {
            handleDeleted(entity);
        };
        socketContext.onUpdated = (entity: T) => {
            handleDeleted(entity);
        };
        socketContext.realmId = realmId;

        createEntitySocket(socketContext);
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
        setDefaults,
    };
}
