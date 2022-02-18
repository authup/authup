/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue, { CreateElement, VNode } from 'vue';
import { RoleList } from '../role';
import { UserRoleListItemActions } from './UserRoleListItemActions';
import { SlotName } from '../../constants';

export type Properties = {
    [key: string]: any;

    userId?: string
};

export const UserRoleList = Vue.extend<any, any, any, Properties>({
    components: {
        UserRoleListItemActions,
        RoleList,
    },
    props: {
        userId: String,
    },
    render(createElement: CreateElement): VNode {
        const vm = this;
        const h = createElement;

        return h(RoleList, {
            scopedSlots: {
                [SlotName.ITEM_ACTIONS]: (slotProps) => h(UserRoleListItemActions, {
                    props: {
                        userId: vm.userId,
                        roleId: slotProps.item.id,
                    },
                }),
            },
        });
    },
});

export default UserRoleList;
