/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import { defineComponent } from 'vue';
import type { RolePermission } from '@authup/core-kit';
import {
    defineEntityManager,
    defineEntityVEmitOptions,
    renderToggleButton,
} from '../../utility';

export const ARolePermissionAssignment = defineComponent({
    props: {
        roleId: String,
        permissionId: String,
    },
    emits: defineEntityVEmitOptions<RolePermission>(),
    async setup(props, setup) {
        const manager = defineEntityManager({
            type: `${EntityType.ROLE_PERMISSION}`,
            setup,
            socket: {
                processEvent(event) {
                    return event.data.role_id === props.roleId &&
                        event.data.permission_id === props.permissionId;
                },
            },
        });

        await manager.resolve({
            query: {
                filters: {
                    role_id: props.roleId,
                    permission_id: props.permissionId,
                },
            },
        });

        return () => renderToggleButton({
            changed: (value) => {
                if (value) {
                    return manager.create({
                        role_id: props.roleId,
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
