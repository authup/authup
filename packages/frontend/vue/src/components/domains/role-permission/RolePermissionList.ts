/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, VNode } from 'vue';
import { Permission, Role } from '@typescript-auth/domains';
import {
    RolePermissionListItemActions,
    RolePermissionListItemActionsProperties,
} from './RolePermissionListItemActions';
import { PermissionList } from '../permission';
import { SlotName } from '../../constants';

export type Properties = {
    entityId: string
};

export const RolePermissionList = Vue.extend<any, any, any, Properties>({
    name: 'RolePermissionList',
    components: {
        PermissionList,
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

        const buildProps = (item: Permission) : RolePermissionListItemActionsProperties => ({
            roleId: vm.entityId,
            permissionId: item.id,
        });

        return h(PermissionList, {
            scopedSlots: {
                [SlotName.ITEM_ACTIONS]: (slotProps) => h(RolePermissionListItemActions, {
                    props: buildProps(slotProps.item),
                }),
            },
        });
    },
});
