/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue from 'vue';
import { RolePermissionListItemActions } from './RolePermissionListItemActions';
import { PermissionList } from '../permission';

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
    template: `
        <div>
            <permission-list>
                <template #item-actions="props">
                    <role-permission-list-item-actions
                        :role-id="roleId"
                        :permission-id="props.item.id"
                    />
                </template>
            </permission-list>
        </div>
    `,
});
