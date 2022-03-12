/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, VNode } from 'vue';
import { Role } from '@authelion/common';
import { RolePermissionListItemActions } from '../role-permission';
import { SlotName } from '../../constants';
import { RoleList } from '../role';
import { RolePermissionListItemActionsProperties } from '../role-permission/RolePermissionListItemActions';

export type Properties = {
    entityId: string
};

export const PermissionRoleList = Vue.extend<any, any, any, Properties>({
    name: 'PermissionRoleList',
    components: {
        RoleList,
        RolePermissionListItemActions,
    },
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
                [SlotName.ITEM_ACTIONS]: (slotProps) => h(RolePermissionListItemActions, {
                    props: buildProps(slotProps.item),
                }),
            },
        });
    },
});

export default PermissionRoleList;
