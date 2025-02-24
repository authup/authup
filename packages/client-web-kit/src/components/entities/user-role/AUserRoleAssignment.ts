/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ResourceType } from '@authup/core-kit';
import { defineComponent } from 'vue';
import type { UserRole } from '@authup/core-kit';
import {
    defineEntityManager,
    defineEntityVEmitOptions,

    renderToggleButton,
} from '../../utility';

export const AUserRoleAssignment = defineComponent({
    props: {
        roleId: String,
        userId: String,
    },
    emits: defineEntityVEmitOptions<UserRole>(),
    async setup(props, setup) {
        const manager = defineEntityManager({
            type: `${ResourceType.USER_ROLE}`,
            setup,
            socket: {
                processEvent(event) {
                    return event.data.role_id === props.roleId &&
                        event.data.user_id === props.userId;
                },
            },
        });

        await manager.resolve({
            query: {
                filters: {
                    user_id: props.userId,
                    role_id: props.roleId,
                },
            },
        });

        return () => renderToggleButton({
            changed: (value) => {
                if (value) {
                    return manager.create({
                        user_id: props.userId,
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

export default AUserRoleAssignment;
