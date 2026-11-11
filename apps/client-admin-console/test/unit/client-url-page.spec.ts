/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import type { AdminConsoleConfig } from '../../src/config';
import { provideAdminConsoleConfig } from '../../src/di';
import UrlPage from '../../src/pages/clients/[id]/url.vue';
import { mountPage } from '../utils';

const CLIENT_ID = '3f5a1c2e-7d4b-4e8a-9c0f-1a2b3c4d5e6f';
const REALM_ID = '5cb2b3fa-6a3a-4f1e-9a4f-2d1f6a1b0c11';

const now = new Date(0).toISOString();

const client : Client = {
    id: CLIENT_ID,
    active: true,
    builtIn: false,
    authMethod: 'none',
    tokenBindingMethod: 'none',
    name: 'hub',
    displayName: null,
    description: null,
    secret: null,
    secretHashed: false,
    secretEncrypted: false,
    redirectUri: null,
    postLogoutRedirectUri: null,
    backchannelLogoutUri: null,
    grantTypes: null,
    baseUrl: null,
    createdAt: now,
    updatedAt: now,
    realmId: REALM_ID,
    realm: {
        id: REALM_ID,
        name: 'master',
        displayName: null,
        description: null,
        builtIn: true,
        createdAt: now,
        updatedAt: now,
    },
    pathId: null,
    path: null,
    accessPolicyId: null,
    accessPolicy: null,
};

const Host = defineComponent({
    setup() {
        const config : AdminConsoleConfig = {
            apiUrl: 'http://fake.test',
            accountConsoleUrl: 'http://fake.test/console/account',
            basePath: '/console/admin',
            clientId: 'admin-console',
            cookiePath: '/',
            cookieSession: false,
            enabled: true,
        };

        provideAdminConsoleConfig(config);

        return () => h(UrlPage, { entity: client });
    },
});

describe('src/pages/clients/[id]/url.vue', () => {
    it('should label a built-in scope with its localized name and keep the raw name beside it', async () => {
        const scopes = [
            {
                id: 'cs-1',
                clientId: CLIENT_ID,
                scopeId: 's-1',
                scope: {
                    id: 's-1',
                    name: ScopeName.OPEN_ID,
                    builtIn: true,
                    displayName: null,
                },
            },
            {
                id: 'cs-2',
                clientId: CLIENT_ID,
                scopeId: 's-2',
                scope: {
                    id: 's-2',
                    name: 'reports',
                    builtIn: false,
                    displayName: null,
                },
            },
        ];

        const { wrapper } = await mountPage('/', {
            'GET /client-scopes': () => ({
                data: scopes,
                meta: {
                    total: scopes.length,
                    limit: 10,
                    offset: 0,
                },
            }),
        }, [{ path: '/', component: Host }]);

        const labels = wrapper.findAll('label');

        expect(labels).toHaveLength(2);
        expect(labels[0].find('small').text()).toEqual(ScopeName.OPEN_ID);
        expect(labels[0].text()).toEqual(`OpenID sign-in ${ScopeName.OPEN_ID}`);
        expect(labels[1].text()).toEqual('reports');
    });
});
