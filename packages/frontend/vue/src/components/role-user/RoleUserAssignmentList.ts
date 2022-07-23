/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, VNode } from 'vue';
import { User } from '@authelion/common';
import { SlotName } from '@vue-layout/utils';
import { UserRoleAssignmentListItemActions } from '../user-role';
import { UserList } from '../user/UserList';
import { UserRoleListItemActionsProperties } from '../user-role/UserRoleAssignmentListItemActions';

type Properties = {
    entityId: string
};

export const RoleUserAssignmentList = Vue.extend<any, any, any, Properties>({
    name: 'RoleUserAssignmentList',
    props: {
        entityId: String,
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        const buildProps = (item: User) : UserRoleListItemActionsProperties => ({
            roleId: vm.entityId,
            userId: item.id,
        });

        return h(UserList, {
            scopedSlots: {
                [SlotName.ITEM_ACTIONS]: (slotProps) => h(UserRoleAssignmentListItemActions, {
                    props: buildProps(slotProps.item),
                }),
            },
        });
    },
});

export default RoleUserAssignmentList;
