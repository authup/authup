/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ListLoadFn } from '@vuecs/list-controls';
import type { PropType } from 'vue';
import { defineComponent, h } from 'vue';
import type { ListMeta } from '../../core';
import { buildListPagination } from '../../core';

export const ListPagination = defineComponent({
    props: {
        total: {
            type: Number,
        },
        meta: {
            type: Object as PropType<ListMeta<any>>,
        },
        busy: {
            type: Boolean,
        },
        load: {
            type: Function as PropType<ListLoadFn<ListMeta<any>>>,
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
