/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue from 'vue';
import { RoleList } from '../role';
import { UserRoleListItemActions } from './UserRoleListItemActions';

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
    template: `
        <div>
            <role-list
                ref="itemList"
            >
                <template #item-actions="props">
                    <user-role-list-item-actions
                        :role-id="props.item.id"
                        :user-id="userId"
                    />
                </template>
            </role-list>
        </div>
    `,
});

export default UserRoleList;
