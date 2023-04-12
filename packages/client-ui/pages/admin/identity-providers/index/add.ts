/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider } from '@authup/core';
import { IdentityProviderProtocol, PermissionName } from '@authup/core';
import { buildFormSelect } from '@vue-layout/form-controls';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { navigateTo } from '#app';
import { definePageMeta, resolveComponent } from '#imports';
import { LayoutKey, LayoutNavigationID } from '../../../../config/layout';
import { useAuthStore } from '../../../../store/auth';

export default defineComponent({
    emits: ['failed', 'created'],
    setup(props, { emit }) {
        definePageMeta({
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.ADMIN,
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.REALM_ADD,
            ],
        });

        const handleCreated = (e: IdentityProvider) => {
            navigateTo({ path: `/admin/identity-providers/${e.id}` });
        };

        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        const protocol = ref<null | `${IdentityProviderProtocol}`>(null);

        const select = buildFormSelect({
            labelContent: 'Protocol',
            options: [
                { id: IdentityProviderProtocol.OAUTH2, value: 'OAuth2' },
                { id: IdentityProviderProtocol.OIDC, value: 'OIDC' },
                { id: IdentityProviderProtocol.LDAP, value: 'LDAP' },
            ],
            value: protocol,
            onChange(value) {
                protocol.value = value;
            },
        });

        const store = useAuthStore();
        const { realmManagementId } = storeToRefs(store);

        const form = resolveComponent('OAuth2ProviderForm');

        const renderForm = () => {
            switch (protocol.value) {
                case IdentityProviderProtocol.OAUTH2:
                    return [
                        h('hr'),
                        h(form, {
                            onCreated: handleCreated,
                            onFailed: handleFailed,
                            realmId: realmManagementId,
                        }),
                    ];
            }

            return [];
        };

        return () => h('div', [
            select,
            renderForm(),
        ]);
    },
});
