/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ListLoadMeta } from '@vue-layout/hyperscript';
import {
    buildList,
    extractValueFromOptionValueInput,
} from '@vue-layout/hyperscript';
import type { Ref } from 'vue';
import {
    computed, ref, unref, watch,
} from 'vue';
import { merge } from 'smob';
import type { ListBuilderContext } from './type';
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
    const meta : Ref<Partial<ListLoadMeta>> = ref({
        limit: 10,
        offset: 0,
        total: 0,
    });

    const filterKey = computed(() => {
        if (
            context.components.items &&
            typeof context.components.items !== 'boolean'
        ) {
            const item = unref(extractValueFromOptionValueInput(context.components.items.item));

            if (item && item.textPropName) {
                return unref(extractValueFromOptionValueInput(item.textPropName));
            }
        }

        return 'name';
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
                    [filterKey.value]: q.value.length > 0 ? `~${q.value}` : q.value,
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

    function build() {
        return buildList({
            ...buildListComponentOptions(context.props, context.components),
            load,
            busy,
            data,
            meta,
            onChange(value) {
                q.value = value;
            },
            onDeleted(value) {
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
        });
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
        q,
        data,
        busy,
        meta,

        build,
        load,
    };
}
