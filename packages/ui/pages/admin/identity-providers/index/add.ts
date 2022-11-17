/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { IdentityProviderProtocol, PermissionID } from '@authelion/common';
import { buildFormSelect } from '@vue-layout/hyperscript';
import { ref } from 'vue';
import { navigateTo } from '#app';
import { definePageMeta, resolveComponent } from '#imports';
import { LayoutKey, LayoutNavigationID } from '../../../../config/layout';

export default defineComponent({
    emits: ['failed', 'created'],
    setup(props, { emit }) {
        definePageMeta({
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.ADMIN,
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionID.REALM_ADD,
            ],
        });

        const handleCreated = (e) => {
            navigateTo({ path: `/admin/identity-providers/${e.id}` });
        };

        const handleFailed = (e) => {
            emit('failed', e);
        };

        const protocol = ref(null);

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

        const form = resolveComponent('OAuth2ProviderForm');

        const renderForm = () => {
            switch (protocol.value) {
                case IdentityProviderProtocol.OAUTH2:
                    return [
                        h('hr'),
                        h(form, {
                            onCreated: handleCreated,
                            onFailed: handleFailed,
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
