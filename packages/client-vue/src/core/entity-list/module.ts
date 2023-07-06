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
    ref, unref, watch,
} from 'vue';
import { merge } from 'smob';
import { useAPIClient } from '../api-client';
import { buildEntityListFooterPagination } from './footer';
import type { EntityListHeaderSearchOptions } from './header';
import { buildDomainListHeader } from './header';
import type {
    EntityListBuilderTemplateOptions,
    EntityListCreateContext, EntityListCreateOutput, EntityListMeta, EntityListRecord,
} from './type';
import {
    buildEntityListCreatedHandler,
    buildEntityListDeletedHandler,
    buildEntityListUpdatedHandler,
    mergeEntityListOptions,
} from './utils';

function create<T extends EntityListRecord>(
    type: `${DomainType}`,
    context: EntityListCreateContext<T>,
) : EntityListCreateOutput<T> {
    const q = ref('');
    const data : Ref<T[]> = ref([]);
    const busy = ref(false);
    const meta : Ref<EntityListMeta> = ref({
        limit: 10,
        offset: 0,
        total: 0,
    });

    const client = useAPIClient();

    let domainAPI : DomainAPI<T> | undefined;
    if (hasOwnProperty(client, type)) {
        domainAPI = client[type] as DomainAPI<T>;
    }

    async function load(targetMeta?: Partial<ListMeta>) {
        if (!domainAPI || busy.value) return;

        busy.value = true;

        if (typeof targetMeta === 'undefined') {
            targetMeta = {};
        }

        try {
            let filter : FiltersBuildInput<T>;
            if (context.queryFilter) {
                if (typeof context.queryFilter === 'function') {
                    filter = context.queryFilter(q.value);
                } else {
                    filter = context.queryFilter;
                }
            } else {
                filter = {
                    ['name' as keyof T]: q.value.length > 0 ? `~${q.value}` : q.value,
                } as FiltersBuildInput<T>;
            }

            let query : BuildInput<T> | undefined;
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
                    filter,
                },
                query || {},
            ));

            if (context.loadAll) {
                data.value.push(...response.data);
            } else {
                data.value = response.data;
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

    const handleCreated = buildEntityListCreatedHandler(data, meta);
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

            if (!header.content) {
                if (options.headerTitle || options.headerSearch) {
                    let search: EntityListHeaderSearchOptions | undefined;
                    if (options.headerSearch) {
                        search = {
                            load(text: string) {
                                q.value = text;
                            },
                            busy,
                        };
                        if (typeof options.headerSearch !== 'boolean') {
                            search = {
                                ...search,
                                ...options.headerSearch,
                            };
                        }
                    }

                    header.content = buildDomainListHeader({
                        title: options.headerTitle,
                        search,
                    });
                }
            }
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
                data: data.value,
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

export function createEntityList<T extends `${DomainType}`>(
    type: T,
    context: EntityListCreateContext<DomainEntity<T>>,
) : EntityListCreateOutput<DomainEntity<T>> {
    return create(type, context);
}
