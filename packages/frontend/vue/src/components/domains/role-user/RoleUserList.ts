/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, VNode } from 'vue';
import { UserRoleListItemActions } from '../user-role';
import { UserList } from '../user/UserList';
import { SlotName } from '../../constants';

type Properties = {
    roleId?: string
};

export const RoleUserList = Vue.extend<any, any, any, Properties>({
    components: { UserList, UserRoleListItemActions },
    props: {
        roleId: String,
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        return h(UserList, {
            scopedSlots: {
                [SlotName.ITEM_ACTIONS]: (slotProps) => h(UserRoleListItemActions, {
                    props: {
                        roleId: vm.roleId,
                        userId: slotProps.item.id,
                    },
                }),
            },
        });
    },
});

export default RoleUserList;
