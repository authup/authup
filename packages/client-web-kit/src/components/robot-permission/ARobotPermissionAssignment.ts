/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core-kit';
import { defineComponent } from 'vue';
import type { RobotPermission } from '@authup/core-kit';
import {
    createResourceManager,
    defineEntityManagerEvents,
    renderEntityAssignAction,
} from '../../core';

export const ARobotPermissionAssignment = defineComponent({
    props: {
        robotId: String,
        permissionId: String,
    },
    emits: defineEntityManagerEvents<RobotPermission>(),
    async setup(props, setup) {
        const manager = createResourceManager({
            type: `${DomainType.ROBOT_PERMISSION}`,
            setup,
            socket: {
                processEvent(event) {
                    return event.data.permission_id === props.permissionId &&
                        event.data.robot_id === props.robotId;
                },
            },
        });

        await manager.resolve({
            query: {
                filters: {
                    robot_id: props.robotId,
                    permission_id: props.permissionId,
                },
            },
        });

        return () => renderEntityAssignAction({
            add: () => manager.create({
                robot_id: props.robotId,
                permission_id: props.permissionId,
            }),
            drop: manager.delete,
            item: manager.data,
            busy: manager.busy,
        });
    },
});

export default ARobotPermissionAssignment;
