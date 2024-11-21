/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LdapIdentityProvider } from '@authup/core-kit';
import { IdentityProviderProtocol } from '@authup/core-kit';
import { createTestSuite } from '../../../../../utils';
import {
    createLdapTestClient, createLdapTestClientURL, createLdapTestUserAccount, dropLdapTestUserAccount,
} from '../../../../../utils/ldap';

describe('src/http/controllers/identity-provider', () => {
    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();

        const client = createLdapTestClient();
        await client.bind();
        await createLdapTestUserAccount(client);
        await client.unbind();
    });

    afterAll(async () => {
        await suite.down();

        const client = createLdapTestClient();
        await client.bind();
        await dropLdapTestUserAccount(client);
        await client.unbind();
    });

    it('should use ldap provider for login', async () => {
        const data : Partial<LdapIdentityProvider> = {
            slug: 'ldap-ldap',
            name: 'ldapLdap',
            enabled: true,
            protocol: IdentityProviderProtocol.LDAP,
            url: createLdapTestClientURL(),
            user: 'cn=admin,dc=example,dc=com',
            password: 'password',
            base_dn: 'dc=example,dc=com',
            user_name_attribute: 'cn',
        };

        const response = await suite.client
            .identityProvider
            .create(data);

        expect(response).toBeDefined();

        const grantResponse = await suite.client
            .token
            .createWithPassword({ username: 'foo', password: 'foo' });

        expect(grantResponse).toBeDefined();
        expect(grantResponse.access_token).toBeDefined();
    });
});
