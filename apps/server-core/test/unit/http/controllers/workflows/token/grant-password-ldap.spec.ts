/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import type { IdentityProviderCreatePayload } from '@authup/core-http-kit';
import { IdentityProviderProtocol } from '@authup/core-kit';
import { createTestApplication } from '../../../../../app';
import { createFakeLdapIdentityProvider } from '../../../../../utils/index.ts';
import {
    createLdapTestClient,
    createLdapTestClientURL,
    createLdapTestUserAccount,
    dropLdapTestUserAccount,
} from '../../../../adapters/ldap/helpers';

describe('src/http/controllers/identity-provider', () => {
    const suite = createTestApplication();
    const ldapUserName = 'grant-ldap-user';

    beforeAll(async () => {
        await suite.setup();

        const client = createLdapTestClient();
        await client.bind();
        await createLdapTestUserAccount(client, ldapUserName);
        await client.unbind();
    });

    afterAll(async () => {
        await suite.teardown();

        const client = createLdapTestClient();
        await client.bind();
        await dropLdapTestUserAccount(client, ldapUserName);
        await client.unbind();
    });

    it('should use ldap provider for login', async () => {
        const data : IdentityProviderCreatePayload = createFakeLdapIdentityProvider({
            enabled: true,
            protocol: IdentityProviderProtocol.LDAP,
            url: createLdapTestClientURL(),
            user: 'cn=admin,dc=example,dc=com',
            password: 'password',
            baseDn: 'dc=example,dc=com',
            userNameAttribute: 'cn',
        });

        const { data: response } = await suite.client
            .identityProvider
            .create(data);

        expect(response).toBeDefined();

        const grantResponse = await suite.client
            .token
            .createWithPassword({
                username: ldapUserName,
                password: ldapUserName,
            });

        expect(grantResponse)
            .toBeDefined();
        expect(grantResponse.access_token)
            .toBeDefined();
    });
});
