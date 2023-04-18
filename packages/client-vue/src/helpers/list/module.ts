/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ListFooterBuildOptionsInput, ListHeaderBuildOptionsInput, ListLoadMeta,
} from '@vue-layout/list-controls';
import {
    buildList,
} from '@vue-layout/list-controls';
import type { Ref, VNodeArrayChildren } from 'vue';
import {
    ref, watch,
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
    const meta : Ref<ListLoadMeta> = ref({
        limit: 10,
        offset: 0,
        total: 0,
    });

    async function load(targetMeta?: Partial<ListLoadMeta>) {
        if (busy.value) return;

        busy.value = true;

        if (typeof targetMeta === 'undefined') {
            targetMeta = {};
        }

        try {
            const response = await context.load(merge(
                {
                    page: {
                        limit: targetMeta.limit ?? meta.value.limit,
                        offset: targetMeta.offset ?? meta.value.offset,
                    },
                    filter: {
                        [context.filterKey || 'name']: q.value.length > 0 ? `~${q.value}` : q.value,
                    },
                },
                context.props.query.value,
            ));

            data.value = response.data;

            meta.value.offset = response.meta.offset;
            meta.value.total = response.meta.total;
            meta.value.limit = response.meta.limit;
        } finally {
            busy.value = false;
        }
    }

    watch(q, async (val, oldVal) => {
        if (val === oldVal) return;

        if (val.length === 1 && val.length > oldVal.length) {
            return;
        }

        await load({ offset: 0 });
    });

    const handleCreated = buildListCreatedHandler(data);
    const handleDeleted = buildListDeletedHandler(data);
    const handleUpdated = buildListUpdatedHandler(data);

    const options = mergeDomainListOptions(context.props, context.defaults);

    function build() : VNodeArrayChildren {
        let header : ListHeaderBuildOptionsInput | undefined;
        if (options.headerTitle || options.headerSearch) {
            let search : DomainListHeaderSearchOptions | undefined;
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

            header = {
                content: buildDomainListHeader({
                    title: options.headerTitle,
                    search,
                }),
            };
        }

        let footer : ListFooterBuildOptionsInput | undefined;
        if (options.footerPagination) {
            footer = {
                content: buildDomainListFooterPagination({
                    load,
                    busy,
                    meta,
                }),
            };
        }

        return [
            buildList({
                footer,
                header,
                noMore: options.noMore,
                items: options.items,

                load,
                busy,
                data,
                total: meta.value.total,
                onDeleted(value: T) {
                    if (context.setup.emit) {
                        context.setup.emit('deleted', value);
                    }

                    if (meta.value.total) {
                        meta.value.total--;
                    }

                    handleDeleted(value);
                },
                onUpdated(value) {
                    if (context.setup.emit) {
                        context.setup.emit('updated', value);
                    }

                    handleUpdated(value);
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
    });

    if (context.props.loadOnSetup) {
        Promise.resolve()
            .then(() => load());
    }

    return {
        data,
        busy,
        meta,

        build,
        load,
    };
}
