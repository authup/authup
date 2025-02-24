/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ResourceType } from '@authup/core-kit';
import { defineComponent } from 'vue';
import type { UserPermission } from '@authup/core-kit';
import {
    defineEntityManager,
    defineEntityVEmitOptions,

    renderToggleButton,
} from '../../utility';

export const AUserPermissionAssignment = defineComponent({
    props: {
        userId: String,
        permissionId: String,
    },
    emits: defineEntityVEmitOptions<UserPermission>(),
    async setup(props, setup) {
        const manager = defineEntityManager({
            type: `${ResourceType.USER_PERMISSION}`,
            setup,
            socket: {
                processEvent(event) {
                    return event.data.permission_id === props.permissionId &&
                        event.data.user_id === props.userId;
                },
            },
        });

        await manager.resolve({
            query: {
                filters: {
                    user_id: props.userId,
                    permission_id: props.permissionId,
                },
            },
        });

        return () => renderToggleButton({
            changed: (value) => {
                if (value) {
                    return manager.create({
                        user_id: props.userId,
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
