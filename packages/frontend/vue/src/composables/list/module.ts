/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PaginationMeta,
    buildList,
} from '@vue-layout/utils';
import {
    Ref, VNode, ref, watch,
} from 'vue';
import { mergeDeep } from '@authelion/common';
import { ListBuilderContext } from './type';
import {
    buildListComponentOptions,
    buildListCreatedHandler,
    buildListDeletedHandler,
    buildListUpdatedHandler,
} from './utils';

export function useListBuilder<T extends Record<string, any>>(
    context: ListBuilderContext<T>,
) {
    const q = ref('');
    const data : Ref<T[]> = ref([]);
    const busy = ref(false);
    const meta : Ref<Partial<PaginationMeta>> = ref({
        limit: 10,
        offset: 0,
        total: 0,
    });

    async function load(targetMeta?: Partial<PaginationMeta>) {
        const queryMeta : Partial<PaginationMeta> = targetMeta || {};

        const response = await context.load(mergeDeep(
            context.props.query.value,
            {
                page: {
                    limit: queryMeta.limit,
                    offset: queryMeta.offset,
                },
                filter: {
                    name: q.value.length > 0 ? `~${q.value}` : q.value,
                },
            },
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

    function build() : VNode {
        return buildList({
            ...buildListComponentOptions(context.props, context.components),
            load,
            busy,
            data,
            meta,
            change(value) {
                q.value = value;
            },
        });
    }

    const handleCreated = buildListCreatedHandler(data);
    const handleUpdated = buildListUpdatedHandler(data);
    const handleDeleted = buildListDeletedHandler(data);

    if (context.props.loadOnSetup) {
        Promise.resolve()
            .then(() => load());
    }

    return {
        q,
        data,
        busy,
        meta,

        build,
        load,
        handleCreated,
        handleUpdated,
        handleDeleted,
    };
}
