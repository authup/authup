/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    defineComponent, h,
} from 'vue';
import type { Robot } from '@authup/core-kit';
import { SlotName } from '@vuecs/list-controls';
import {
    ARobotRoleAssignment,
} from '../robot-role/ARobotRoleAssignment';
import { ARobots } from '../robot';

export const ARoleRobotAssignments = defineComponent({
    props: {
        entityId: String,
    },
    setup(props) {
        return () => h(ARobots, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: Robot }) => h(
                ARobotRoleAssignment,
                {
                    roleId: props.entityId,
                    robotId: slotProps.data.id,
                    key: slotProps.data.id,
                },
            ),
        });
    },
});

export default ARoleRobotAssignments;
