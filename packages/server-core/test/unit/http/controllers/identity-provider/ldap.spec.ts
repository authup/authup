/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LdapIdentityProvider } from '@authup/core-kit';
import { IdentityProviderProtocol } from '@authup/core-kit';
import { dropTestDatabase, useTestDatabase } from '../../../../utils/database/connection';
import {
    createLdapTestClient, createLdapTestClientURL, createLdapTestUserAccount, dropLdapTestUserAccount,
} from '../../../../utils/ldap';
import { useSuperTest } from '../../../../utils/supertest';

describe('src/http/controllers/identity-provider', () => {
    let superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();

        const client = createLdapTestClient();
        await client.bind();
        await createLdapTestUserAccount(client);
        await client.unbind();
    });

    afterAll(async () => {
        await dropTestDatabase();

        superTest = undefined;

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
        let response = await superTest
            .post('/identity-providers')
            .send(data)
            .auth('admin', 'start123');

        expect(response.status).toEqual(201);
        expect(response.body).toBeDefined();

        response = await superTest
            .post('/token')
            .send({
                grant_type: 'password',
                username: 'foo',
                password: 'foo',
            });

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.access_token).toBeDefined();
    });
});
