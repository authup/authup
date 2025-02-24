/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import {
    defineComponent,
} from 'vue';
import type { RobotRole } from '@authup/core-kit';
import {
    defineEntityManager,
    defineEntityVEmitOptions,

    renderToggleButton,
} from '../../utility';

export const ARobotRoleAssignment = defineComponent({
    props: {
        roleId: String,
        robotId: String,
    },
    emits: defineEntityVEmitOptions<RobotRole>(),
    async setup(props, setup) {
        const manager = defineEntityManager({
            type: `${EntityType.ROBOT_ROLE}`,
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

        return () => renderToggleButton({
            changed: (value) => {
                if (value) {
                    return manager.create({
                        robot_id: props.robotId,
                        role_id: props.roleId,
                    });
                }

                return manager.delete();
            },
            value: !!manager.data.value,
            isBusy: manager.busy.value,
        });
    },
});

export default ARobotRoleAssignment;
