/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineComponent, h } from 'vue';
import type { Role } from '@authup/core';
import { SlotName } from '@vue-layout/hyperscript';
import { RolePermissionAssignmentListItemActions } from '../role-permission';
import { RoleList } from '../role';

export const PermissionRoleAssignmentList = defineComponent({
    name: 'PermissionRoleAssignmentList',
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        return () => h(RoleList, {}, {
            [SlotName.ITEM_ACTIONS]: (slotProps: { data: Role }) => h(
                RolePermissionAssignmentListItemActions,
                {
                    permissionId: props.entityId,
                    roleId: slotProps.data.id,
                },
            ),
        });
    },
});

export default PermissionRoleAssignmentList;
