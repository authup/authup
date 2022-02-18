/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, VNode } from 'vue';
import { RolePermissionListItemActions } from './RolePermissionListItemActions';
import { PermissionList } from '../permission';
import { SlotName } from '../../constants';

export type Properties = {
    roleId?: string
};

export const RolePermissionList = Vue.extend<any, any, any, Properties>({
    name: 'RolePermissionList',
    components: {
        PermissionList,
        RolePermissionListItemActions,
    },
    props: {
        roleId: String,
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        return h(PermissionList, {
            scopedSlots: {
                [SlotName.ITEM_ACTIONS]: (slotProps) => h(RolePermissionListItemActions, {
                    props: {
                        roleId: vm.roleId,
                        permissionId: slotProps.item.id,
                    },
                }),
            },
        });
    },
});
