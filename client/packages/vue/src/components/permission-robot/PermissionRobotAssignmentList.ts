/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
import type { Robot } from '@authup/core';
import { SlotName } from '@vue-layout/list-controls';
import {
    RobotPermissionAssignAction,
} from '../robot-permission/RobotPermissionAssignAction';
import { RobotList } from '../robot';

export const PermissionRobotAssignmentList = defineComponent({
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props, { slots }) {
        return () => h(RobotList, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: Robot }) => h(
                RobotPermissionAssignAction,
                {
                    permissionId: props.entityId,
                    robotId: slotProps.data.id,
                },
            ),
            ...slots,
        });
    },
});

export default PermissionRobotAssignmentList;
