/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Vue from 'vue';
import { OAuth2ProviderRoleListItem } from './OAuth2ProviderRoleListItem';
import { RoleList } from '../role';

type Properties = {
    [key: string]: any;

    providerId?: string
};

export const OAuth2ProviderRoleList = Vue.extend<
any,
any,
any,
Properties
>({
    name: 'OAuth2ProviderRoleList',
    components: {
        RoleList,
        OAuth2ProviderRoleListItem,
    },
    props: {
        providerId: String,
    },
    template: `
        <div>
            <role-list
                ref="roleList"
                :query="query"
                :with-header="false"
            >
                <template #header-title>
                    <span />
                </template>
                <template #items="props">
                    <template v-for="role in props.items">
                        <o-auth2-provider-role-list-item
                            :key="role.id"
                            :provider-id="providerId"
                            :role="role"
                        />
                    </template>
                </template>
            </role-list>
        </div>
    `,
});
