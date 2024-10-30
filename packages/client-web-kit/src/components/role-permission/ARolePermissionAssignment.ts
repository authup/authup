/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core-kit';
import { defineComponent } from 'vue';
import type { RolePermission } from '@authup/core-kit';
import {
    createResourceManager,
    defineEntityManagerEvents,
    renderEntityAssignAction,
} from '../../core';

export const ARolePermissionAssignment = defineComponent({
    props: {
        roleId: String,
        permissionId: String,
    },
    emits: defineEntityManagerEvents<RolePermission>(),
    async setup(props, setup) {
        const manager = createResourceManager({
            type: `${DomainType.ROLE_PERMISSION}`,
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

        return () => renderEntityAssignAction({
            add: () => manager.create({
                role_id: props.roleId,
                permission_id: props.permissionId,
            }),
            drop: manager.delete,
            item: manager.data,
            busy: manager.busy,
        });
    },
});
