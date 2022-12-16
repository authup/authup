/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Scope } from '@authup/common';
import { PropType } from 'vue';
import { defineNuxtComponent, resolveComponent } from '#imports';

export default defineNuxtComponent({
    props: {
        entity: {
            type: Object as PropType<Scope>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        // todo: remove this when nuxt is fixed
        if (!props.entity) {
            return () => h('div', []);
        }

        const list = resolveComponent('ScopeClientAssignmentList');
        return () => h(list, {
            entityId: props.entity.id,
        });
    },
});
