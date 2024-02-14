/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from 'ldapjs';
import { promisify } from 'node:util';
import type { StartedTestContainer } from 'testcontainers';
import { LdapIdentityProviderFlow } from '../../../src';

const addClient = async (client: Client) => {
    const add = promisify(client.add.bind(client));
    try {
        await add('cn=foo,dc=example,dc=com', {
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

const dropClient = async (client: Client) => {
    const drop = promisify(client.del.bind(client));
    try {
        await drop('cn=foo,dc=example,dc=com');
    } catch (e) {
        // do nothing :)
    }
};

describe('src/domains/identity-provider/flow/ldap', () => {
    let flow : LdapIdentityProviderFlow;

    const container : StartedTestContainer = globalThis.OPENLDAP_CONTAINER;

    beforeAll(async () => {
        flow = new LdapIdentityProviderFlow({
            url: `ldap://${container.getHost()}:${container.getFirstMappedPort()}`,
            user: 'ldap',
            password: 'ldap',
            base_dn: 'dc=example,dc=com',
            user_name_attribute: 'cn',
        });
    });

    afterAll(async () => {
        await flow.unbind();
    });

    it('should establish a connection', async () => {
        const client = await flow.bind();
        expect(client.connected).toBeTruthy();

        await flow.unbind();
    });

    it('should search and find user', async () => {
        const client = await flow.bind();
        await addClient(client);

        const user = await flow.searchUser('foo');
        expect(user).toBeDefined();
        expect(user.dn).toEqual('cn=foo,dc=example,dc=com');
        expect(user.cn).toEqual('foo');
        expect(user.sn).toEqual('bar');
        expect(user.mail).toEqual('foo.bar@example.com');
        expect(user.objectClass).toEqual('inetOrgPerson');

        await dropClient(client);
        await flow.unbind();
    });

    it('should login with user/password', async () => {
        let client = await flow.bind();
        await addClient(client);

        await flow.bind('foo', 'foo');

        client = await flow.bind();
        await dropClient(client);
        await flow.unbind();
    });
});
