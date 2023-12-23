/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    defineComponent, h,
} from 'vue';
import type { Robot } from '@authup/core';
import { SlotName } from '@vuecs/list-controls';
import {
    RobotRoleAssignAction,
} from '../robot-role/RobotRoleAssignAction';
import { RobotList } from '../robot';

export const RoleRobotAssignmentList = defineComponent({
    props: {
        entityId: String,
    },
    setup(props) {
        return () => h(RobotList, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: Robot }) => h(
                RobotRoleAssignAction,
                {
                    roleId: props.entityId,
                    robotId: slotProps.data.id,
                },
            ),
        });
    },
});

export default RoleRobotAssignmentList;
