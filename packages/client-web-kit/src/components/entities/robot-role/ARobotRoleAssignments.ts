/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
import type { Role } from '@authup/core-kit';
import { SlotName } from '@vuecs/list-controls';
import { ARoles } from '../role';
import { ARobotRoleAssignment } from './ARobotRoleAssignment';

export const ARobotRoleAssignments = defineComponent({
    props: {
        entityId: String,
    },
    setup(props, { slots }) {
        return () => h(ARoles, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: Role }) => h(
                ARobotRoleAssignment,
                {
                    robotId: props.entityId,
                    roleId: slotProps.data.id,
                    key: slotProps.data.id,
                },
            ),
            ...slots,
        });
    },
});

export default ARobotRoleAssignments;
