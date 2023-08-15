/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@authup/core';
import type { DomainAPI, DomainEntity, DomainType } from '@authup/core';
import type {
    ListFooterBuildOptionsInput, ListHeaderBuildOptionsInput, ListMeta,
} from '@vue-layout/list-controls';
import {
    buildList,
} from '@vue-layout/list-controls';
import type { BuildInput, FiltersBuildInput } from 'rapiq';
import type { Ref, VNodeArrayChildren } from 'vue';
import {
    computed, isRef,
    ref, unref, watch,
} from 'vue';
import { isObject, merge } from 'smob';
import { boolableToObject } from '../../utils';
import { injectAPIClient } from '../api-client';
import { createEntitySocket } from '../entity-socket';
import type { EntitySocketContext } from '../entity-socket';
import { isQuerySortedDescByDate } from '../query';
import { buildEntityListFooterPagination } from './footer';
import type { EntityListHeaderSearchOptions } from './header';
import { buildDomainListHeader } from './header';
import type {
    EntityList,
    EntityListBuilderTemplateOptions,
    EntityListCreateContext,
    EntityListMeta,
} from './type';
import {
    buildEntityListCreatedHandler,
    buildEntityListDeletedHandler,
    buildEntityListUpdatedHandler,
    mergeEntityListOptions,
} from './utils';

type Entity<T> = T extends Record<string, any> ? T : never;
type DomainTypeInfer<T> = T extends DomainEntity<infer U> ? U extends `${DomainType}` ? U : never : never;

export function createEntityList<
    A extends DomainTypeInfer<DomainEntity<any>>,
    T = DomainEntity<A>,
>(
    context: EntityListCreateContext<A, T>,
) : EntityList<T> {
    const q = ref('');
    const data : Ref<T[]> = ref([]);
    const busy = ref(false);
    const meta : Ref<EntityListMeta> = ref({
        limit: 10,
        offset: 0,
        total: 0,
    });

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

    async function load(targetMeta?: Partial<ListMeta>) {
        if (!domainAPI || busy.value) return;

        busy.value = true;

        if (typeof targetMeta === 'undefined') {
            targetMeta = {};
        }

        try {
            let filters : FiltersBuildInput<Entity<T>>;
            if (context.queryFilters) {
                if (typeof context.queryFilters === 'function') {
                    filters = context.queryFilters(q.value) as FiltersBuildInput<Entity<T>>;
                } else {
                    filters = context.queryFilters as FiltersBuildInput<Entity<T>>;
                }
            } else {
                filters = {
                    ['name' as keyof T]: q.value.length > 0 ? `~${q.value}` : q.value,
                } as FiltersBuildInput<Entity<T>>;
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
                {
                    page: {
                        limit: targetMeta.limit ?? meta.value.limit,
                        offset: targetMeta.offset ?? meta.value.offset,
                    },
                    filters,
                },
                query || {},
            ));

            if (context.loadAll) {
                data.value.push(...response.data as T[]);
            } else {
                data.value = response.data as T[];
            }

            meta.value.offset = response.meta.offset;
            meta.value.total = response.meta.total;
            meta.value.limit = response.meta.limit;
        } finally {
            busy.value = false;
        }

        if (
            context.loadAll &&
            meta.value.total > data.value.length
        ) {
            await load({
                ...meta.value,
                offset: meta.value.offset + meta.value.limit,
            });
        }
    }

    watch(q, async (val, oldVal) => {
        if (val === oldVal) return;

        if (val.length === 1 && val.length > oldVal.length) {
            return;
        }

        await load({ offset: 0 });
    });

    const handleCreated = buildEntityListCreatedHandler(data, meta, context.onCreated);
    const handleDeleted = buildEntityListDeletedHandler(data, meta);
    const handleUpdated = buildEntityListUpdatedHandler(data);

    let options = context.props;

    const setDefaults = (defaults: EntityListBuilderTemplateOptions<T>) => {
        options = mergeEntityListOptions(context.props, defaults);
    };

    function render() : VNodeArrayChildren {
        let header : ListHeaderBuildOptionsInput<T> | undefined;
        if (options.header) {
            header = typeof options.header === 'boolean' ? {} : options.header;

            let search: EntityListHeaderSearchOptions | undefined;
            if (options.headerSearch) {
                search = {
                    load(text: string) {
                        q.value = text;
                    },
                    busy: busy.value,
                    ...boolableToObject(options.headerSearch),
                };
            }

            header.content = buildDomainListHeader({
                title: options.headerTitle,
                search,
                slots: context.setup.slots || {},
            });
        }

        let footer : ListFooterBuildOptionsInput<T> | undefined;
        if (options.footer) {
            footer = typeof options.footer === 'boolean' ? {} : options.footer;

            if (!footer.content) {
                if (options.footerPagination) {
                    footer.content = buildEntityListFooterPagination({
                        load,
                        busy,
                        meta,
                    });
                }
            }
        }

        if (options.item) {
            if (
                typeof options.body === 'undefined' ||
                typeof options.body === 'boolean'
            ) {
                options.body = {
                    item: options.item,
                };
            } else {
                options.body.item = options.item;
            }
        }

        return [
            buildList({
                footer,
                header,
                noMore: options.noMore,
                body: options.body,

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
            }),
        ];
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
                meta.value.offset === 0;

            if (isSorted || meta.value.total < meta.value.limit) {
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

        handleCreated,
        handleUpdated,
        handleDeleted,

        render,
        load,
        setDefaults,
    };
}
