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

function renderRow(label: string, content: any) {
    return h('div', { class: 'd-flex flex-row gap-2 mb-2' }, [
        h('strong', { style: 'min-width: 120px' }, label),
        h('div', content),
    ]);
}

export const APolicySummary = defineComponent({
    props: {
        entity: {
            type: Object as PropType<Policy>,
            required: true,
        },
    },
    setup(props) {
        return () => {
            const rows = [
                renderRow('Name', props.entity.name),
                renderRow('Type', h(APolicyTypeBadge, { type: props.entity.type })),
            ];

            if (props.entity.display_name) {
                rows.push(renderRow('Display Name', props.entity.display_name));
            }

            if (props.entity.description) {
                rows.push(renderRow('Description', props.entity.description));
            }

            if (props.entity.invert) {
                rows.push(renderRow('Invert', h('span', { class: 'badge bg-warning' }, 'Yes')));
            }

            if (props.entity.built_in) {
                rows.push(renderRow('Built-in', h('span', { class: 'badge bg-secondary' }, 'Yes')));
            }

            return h('div', rows);
        };
    },
});
