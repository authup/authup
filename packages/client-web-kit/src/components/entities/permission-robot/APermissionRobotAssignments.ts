/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
import type { Robot } from '@authup/core-kit';
import { SlotName } from '@vuecs/list-controls';
import {
    ARobotPermissionAssignment,
} from '../robot-permission/ARobotPermissionAssignment';
import { ARobots } from '../robot';

export const APermissionRobotAssignments = defineComponent({
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props, { slots }) {
        return () => h(ARobots, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: Robot }) => h(
                ARobotPermissionAssignment,
                {
                    permissionId: props.entityId,
                    robotId: slotProps.data.id,
                    key: slotProps.data.id,
                },
            ),
            ...slots,
        });
    },
});

export default APermissionRobotAssignments;
