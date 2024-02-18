/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EqualityFilter } from 'ldapjs';
import type { StartedTestContainer } from 'testcontainers';
import { LdapClient } from '../../../src/core';

const addClient = async (client: LdapClient) => {
    try {
        await client.add('cn=foo,dc=example,dc=com', {
            cn: 'foo',
            sn: 'bar',
            mail: 'foo.bar@example.com',
            objectClass: 'inetOrgPerson',
            userPassword: 'foo',
        });
    } catch (e) {
        // do nothing ;)
    }
};

const dropClient = async (client: LdapClient) => {
    try {
        await client.del('cn=foo,dc=example,dc=com');
    } catch (e) {
        // do nothing :)
    }
};

describe('src/domains/identity-provider/flow/ldap', () => {
    let client : LdapClient;

    const container : StartedTestContainer = globalThis.OPENLDAP_CONTAINER;

    beforeAll(async () => {
        client = new LdapClient({
            url: `ldap://${container.getHost()}:${container.getFirstMappedPort()}`,
            user: 'cn=admin,dc=example,dc=com',
            password: 'password',
            baseDn: 'dc=example,dc=com',
        });
    });

    afterAll(async () => {
        await client.unbind();
    });

    it('should establish a connection', async () => {
        await client.bind();

        expect(client.connected).toBeTruthy();
    });

    it('should search and login with user', async () => {
        await client.bind();
        await addClient(client);

        const users = await client.search({
            filter: new EqualityFilter({
                attribute: 'cn',
                value: 'foo',
            }),
        });
        expect(users.length).toEqual(1);
        const user = users.pop();

        expect(user.dn).toEqual('cn=foo,dc=example,dc=com');
        expect(user.cn).toEqual('foo');
        expect(user.sn).toEqual('bar');
        expect(user.mail).toEqual('foo.bar@example.com');
        expect(user.objectClass).toEqual('inetOrgPerson');
        expect(user.userPassword).toEqual('foo');

        await client.bind(user.dn, user.userPassword);

        await client.bind();
        await dropClient(client);
    });
});
