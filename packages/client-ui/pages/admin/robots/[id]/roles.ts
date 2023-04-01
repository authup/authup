/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Robot } from '@authup/core';
import type { PropType } from 'vue';
import { resolveComponent } from '#imports';

export default defineNuxtComponent({
    props: {
        entity: {
            type: Object as PropType<Robot>,
            required: true,
        },
    },
    setup(props) {
        // todo: remove this when nuxt is fixed
        if (!props.entity) {
            return () => h('div', []);
        }

        const list = resolveComponent('RobotRoleAssignmentList');
        return () => h(list, {
            entityId: props.entity.id,
        });
    },
});
