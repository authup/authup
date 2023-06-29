/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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
import { buildDomainListFooterPagination } from '../list-footer';
import type { DomainListHeaderSearchOptions } from '../list-header';
import { buildDomainListHeader } from '../list-header';
import type { DomainListBuilderContext, DomainListBuilderOutput } from './type';
import {
    buildListCreatedHandler,
    buildListDeletedHandler,
    buildListUpdatedHandler,
    mergeDomainListOptions,
} from './utils';

export function createDomainListBuilder<T extends Record<string, any>>(
    context: DomainListBuilderContext<T>,
) : DomainListBuilderOutput<T> {
    const q = ref('');
    const data : Ref<T[]> = ref([]);
    const busy = ref(false);
    const meta : Ref<ListMeta> = ref({
        limit: 10,
        offset: 0,
        total: 0,
    });

    async function load(targetMeta?: Partial<ListMeta>) {
        if (busy.value) return;

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

            const response = await context.load(merge(
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

    const handleCreated = buildListCreatedHandler(data, meta);
    const handleDeleted = buildListDeletedHandler(data, meta);
    const handleUpdated = buildListUpdatedHandler(data);

    const options = mergeDomainListOptions(context.props, context.defaults);

    function build() : VNodeArrayChildren {
        let header : ListHeaderBuildOptionsInput<T> | undefined;
        if (options.header) {
            header = typeof options.header === 'boolean' ? {} : options.header;

            if (!header.content) {
                if (options.headerTitle || options.headerSearch) {
                    let search: DomainListHeaderSearchOptions | undefined;
                    if (options.headerSearch) {
                        search = {
                            load(text) {
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
                    footer.content = buildDomainListFooterPagination({
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

        build,
        load,
    };
}
