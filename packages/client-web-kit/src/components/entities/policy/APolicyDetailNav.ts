/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';

export const APolicyDetailNav = defineComponent({
    props: {
        policyId: {
            type: String,
            required: true,
        },
    },
    emits: ['click'],
    setup(props, { emit }) {
        return () => h('button', {
            class: 'btn btn-xs btn-outline-info',
            title: 'View policy details',
            onClick(e: Event) {
                e.preventDefault();
                emit('click', props.policyId);
            },
        }, [
            h('i', { class: 'fa fa-eye' }),
        ]);
    },
});
