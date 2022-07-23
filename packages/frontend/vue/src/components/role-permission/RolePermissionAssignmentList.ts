/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, VNode } from 'vue';
import { Permission, Role } from '@authelion/common';
import { SlotName } from '@vue-layout/utils';
import {
    RolePermissionAssignmentListItemActions,
    RolePermissionListItemActionsProperties,
} from './RolePermissionAssignmentListItemActions';
import { PermissionList } from '../permission';

export type Properties = {
    entityId: string
};

export const RolePermissionAssignmentList = Vue.extend<any, any, any, Properties>({
    name: 'RolePermissionAssignmentList',
    props: {
        entityId: {
            type: String,
            required: true,
        },
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        const buildProps = (item: Permission) : RolePermissionListItemActionsProperties => ({
            roleId: vm.entityId,
            permissionId: item.id,
        });

        return h(PermissionList, {
            scopedSlots: {
                [SlotName.ITEM_ACTIONS]: (slotProps) => h(RolePermissionAssignmentListItemActions, {
                    props: buildProps(slotProps.item),
                }),
            },
        });
    },
});
