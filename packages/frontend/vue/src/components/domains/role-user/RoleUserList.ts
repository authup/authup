/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue from 'vue';
import { UserRoleListItemActions } from '../user-role';
import { UserList } from '../user/UserList';

type Properties = {
    roleId?: string
};

export const RoleUserList = Vue.extend<any, any, any, Properties>({
    components: { UserList, UserRoleListItemActions },
    props: {
        roleId: String,
    },
    template: `
        <div>
            <user-list>
                <template #item-actions="props">
                    <user-role-list-item-actions
                        :role-id="roleId"
                        :user-id="props.item.id"
                    />
                </template>
            </user-list>
        </div>
    `,
});

export default RoleUserList;
