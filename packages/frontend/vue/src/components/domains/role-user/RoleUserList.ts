/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, VNode } from 'vue';
import { Role, User } from '@typescript-auth/domains';
import { UserRoleListItemActions } from '../user-role';
import { UserList } from '../user/UserList';
import { SlotName } from '../../constants';
import { UserRoleListItemActionsProperties } from '../user-role/UserRoleListItemActions';

type Properties = {
    entityId: string
};

export const RoleUserList = Vue.extend<any, any, any, Properties>({
    name: 'RoleUserList',
    components: { UserList, UserRoleListItemActions },
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
                [SlotName.ITEM_ACTIONS]: (slotProps) => h(UserRoleListItemActions, {
                    props: buildProps(slotProps.item),
                }),
            },
        });
    },
});

export default RoleUserList;
