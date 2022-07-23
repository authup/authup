/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, VNode } from 'vue';
import { Role } from '@authelion/common';
import { SlotName } from '@vue-layout/utils';
import { RolePermissionAssignmentListItemActions } from '../role-permission';
import { RoleList } from '../role';
import { RolePermissionListItemActionsProperties } from '../role-permission/RolePermissionAssignmentListItemActions';

export type Properties = {
    entityId: string
};

export const PermissionRoleAssignmentList = Vue.extend<any, any, any, Properties>({
    name: 'PermissionRoleAssignmentList',
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        const buildProps = (item: Role) : RolePermissionListItemActionsProperties => ({
            permissionId: vm.entityId,
            roleId: item.id,
        });

        return h(RoleList, {
            scopedSlots: {
                [SlotName.ITEM_ACTIONS]: (slotProps) => h(RolePermissionAssignmentListItemActions, {
                    props: buildProps(slotProps.item),
                }),
            },
        });
    },
});

export default PermissionRoleAssignmentList;
