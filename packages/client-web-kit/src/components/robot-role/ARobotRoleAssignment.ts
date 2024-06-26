/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core-kit';
import {
    defineComponent,
} from 'vue';
import type { RobotRole } from '@authup/core-kit';
import {
    createEntityManager,
    defineEntityManagerEvents,
    renderEntityAssignAction,
} from '../../core';

export const ARobotRoleAssignment = defineComponent({
    props: {
        roleId: String,
        robotId: String,
    },
    emits: defineEntityManagerEvents<RobotRole>(),
    async setup(props, setup) {
        const manager = createEntityManager({
            type: `${DomainType.ROBOT_ROLE}`,
            setup,
            socket: {
                processEvent(event) {
                    return event.data.robot_id === props.robotId &&
                        event.data.role_id === props.roleId;
                },
            },
        });

        await manager.resolve({
            query: {
                filters: {
                    robot_id: props.robotId,
                    role_id: props.roleId,
                },
            },
        });

        return () => renderEntityAssignAction({
            add: () => manager.create({
                robot_id: props.robotId,
                role_id: props.roleId,
            }),
            drop: manager.delete,
            item: manager.data,
            busy: manager.busy,
        });
    },
});

export default ARobotRoleAssignment;
