/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { buildPagination } from './module';
import type { PaginationLoadFn } from './type';

export const APagination = defineComponent({
    props: {
        total: {
            type: Number,
        },
        meta: {
            type: Object as PropType<Record<string, any>>,
        },
        busy: {
            type: Boolean,
        },
        load: {
            type: Function as PropType<PaginationLoadFn>,
            required: true,
        },
    },
    setup(props) {
        return () => buildPagination({
            busy: props.busy,
            load: props.load,
            meta: props.meta,
            total: props.total,
        });
    },
});
