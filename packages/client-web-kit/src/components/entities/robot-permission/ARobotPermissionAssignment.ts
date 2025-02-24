/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import { defineComponent } from 'vue';
import type { RobotPermission } from '@authup/core-kit';
import {
    defineEntityManager,
    defineEntityVEmitOptions,

    renderToggleButton,
} from '../../utility';

export const ARobotPermissionAssignment = defineComponent({
    props: {
        robotId: String,
        permissionId: String,
    },
    emits: defineEntityVEmitOptions<RobotPermission>(),
    async setup(props, setup) {
        const manager = defineEntityManager({
            type: `${EntityType.ROBOT_PERMISSION}`,
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

        return () => renderToggleButton({
            changed: (value) => {
                if (value) {
                    return manager.create({
                        robot_id: props.robotId,
                        permission_id: props.permissionId,
                    });
                }

                return manager.delete();
            },
            value: !!manager.data.value,
            isBusy: manager.busy.value,
        });
    },
});

export default ARobotPermissionAssignment;
