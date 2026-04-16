/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineComponent, h } from 'vue';
import { APolicyTypeBadge } from './APolicyTypeBadge';
import { APolicyDetailNav } from './APolicyDetailNav';

export const APolicyInlineInfo = defineComponent({
    props: {
        entity: {
            type: Object as PropType<Policy>,
            required: true,
        },
    },
    setup(props) {
        return () => {
            const children = [
                h(APolicyTypeBadge, { type: props.entity.type }),
            ];

            if (props.entity.invert) {
                children.push(h('span', { class: 'badge bg-warning' }, 'Inverted'));
            }

            children.push(h(APolicyDetailNav, { policyId: props.entity.id }));

            return h('span', { class: 'd-flex gap-1 align-items-center' }, children);
        };
    },
});
