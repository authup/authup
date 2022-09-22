/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { User } from '@authelion/common';
import { PropType } from 'vue';
import { resolveComponent } from '#imports';

export default defineNuxtComponent({
    props: {
        entity: Object as PropType<User>,
    },
    setup(props) {
        const list = resolveComponent('UserRoleAssignmentList');
        return () => h(list, {
            entityId: props.entity.id,
        });
    },
});
