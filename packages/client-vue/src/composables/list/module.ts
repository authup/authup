/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ListLoadMeta } from '@vue-layout/list-controls';
import {
    buildList,
} from '@vue-layout/list-controls';
import type { Ref, VNodeArrayChildren } from 'vue';
import {
    ref, watch,
} from 'vue';
import { merge } from 'smob';
import type { DomainListBuilderContext, DomainListBuilderOutput } from './type';
import {
    buildListComponentOptions,
    buildListCreatedHandler,
    buildListDeletedHandler,
    buildListUpdatedHandler,
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
        if (typeof targetMeta === 'undefined') {
            targetMeta = {};
        }

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
    }

    watch(q, async (val, oldVal) => {
        if (val === oldVal) return;

        if (val.length === 1 && val.length > oldVal.length) {
            return;
        }

        await load({ offset: 0 });
    });

    const handleDeleted = buildListDeletedHandler(data);
    const handleUpdated = buildListUpdatedHandler(data);

    function build() : VNodeArrayChildren {
        return [
            buildList({
                ...buildListComponentOptions(context.props, context.components),
                load,
                busy,
                data,
                total: meta.value.total,
                onChange(value: string) {
                    q.value = value;
                },
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
        handleCreated: buildListCreatedHandler(data),
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
