/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import { EqualityFilter } from 'ldapjs';
import type { LdapClient } from '../../../src/core';
import { createLdapTestClient, createLdapTestUserAccount, dropLdapTestUserAccount } from '../../utils/ldap';

describe('src/domains/identity-provider/flow/ldap', () => {
    let client : LdapClient;

    beforeAll(async () => {
        client = createLdapTestClient();
        await client.bind();
        await createLdapTestUserAccount(client);
    });

    afterAll(async () => {
        await client.bind();
        await dropLdapTestUserAccount(client);
        await client.unbind();
        client = undefined;
    });

    it('should resolve dns', () => {
        expect(client.resolveDn('dc=example', 'dc=com'))
            .toEqual('dc=example,dc=com');

        expect(client.resolveDn('ou=user, dc=example,dc=com', 'dc=example,dc=com'))
            .toEqual('ou=user, dc=example,dc=com');

        expect(client.resolveDn(undefined, 'dc=example,dc=com'))
            .toEqual('dc=example,dc=com');

        expect(client.resolveDn('dc=example,dc=com', 'dc=example, dc=com'))
            .toEqual('dc=example,dc=com');
    });

    it('should search and login with user', async () => {
        await client.bind();
        const users = await client.search({
            filter: new EqualityFilter({
                attribute: 'cn',
                value: 'foo',
            }),
        });
        expect(users.length).toEqual(1);
        const user = users.pop();

        expect(user.dn).toEqual('cn=foo,dc=example,dc=com');
        expect(user.cn).toEqual(['foo']);
        expect(user.sn).toEqual(['bar']);
        expect(user.mail).toEqual(['foo.bar@example.com']);
        expect(user.objectClass).toEqual(['inetOrgPerson']);
        expect(user.userPassword).toEqual(['foo']);
    });

    it('should authenticate with test user account', async () => {
        await client.bind('cn=foo,dc=example,dc=com', 'foo');
    });
});
