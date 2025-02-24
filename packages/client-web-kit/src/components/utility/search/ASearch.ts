/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ListLoadFn } from '@vuecs/list-controls';
import type { PropType, SlotsType } from 'vue';
import { defineComponent } from 'vue';
import type { ListMeta } from '../entity';
import type { SearchSlotProps } from './type';
import { buildListSearch } from './module';

export const ASearch = defineComponent({
    props: {
        // todo: add entity-key prop
        icon: {
            type: Boolean,
        },
        iconPosition: {
            type: String as PropType<'start' | 'end'>,
        },
        iconClass: {
            type: String,
        },
        busy: {
            type: Boolean,
        },
        load: {
            type: Function as PropType<ListLoadFn<ListMeta<any>>>,
        },
        meta: {
            type: Object as PropType<ListMeta<any>>,
        },
    },
    slots: Object as SlotsType<{
        default: SearchSlotProps
    }>,
    setup(props, { slots }) {
        return () => buildListSearch({
            slots,
            icon: props.icon,
            iconPosition: props.iconPosition,
            busy: props.busy,
            load: props.load,
            meta: props.meta,
        });
    },
});
