/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ListLoadFn } from '@vue-layout/list-controls';
import type { PropType } from 'vue';
import { defineComponent, h } from 'vue';
import type { ListQuery } from '../../core';
import { buildListPagination } from '../../core';

export const ListPagination = defineComponent({
    props: {
        total: {
            type: Number,
        },
        meta: {
            type: Object as PropType<ListQuery<any>>,
        },
        busy: {
            type: Boolean,
        },
        load: {
            type: Function as PropType<ListLoadFn<ListQuery<any>>>,
        },
    },
    setup(props) {
        if (!props.load) {
            return h('div', [
                'The "load" property must be defined.',
            ]);
        }

        return () => buildListPagination({
            busy: props.busy,
            load: props.load,
            meta: props.meta,
            total: props.total,
        });
    },
});
