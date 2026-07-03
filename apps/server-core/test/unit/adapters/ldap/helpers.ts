/*
 * Copyright (c) 2024-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { inject } from 'vitest';
import { LdapClient } from '../../../../src/adapters/shared/ldap';
import type { ILdapClient } from '../../../../src/core';

// Spec files run in parallel workers against ONE shared OpenLDAP container —
// every spec must use its own account name or a sibling's afterAll drop
// races a concurrent login.
export async function createLdapTestUserAccount(client: ILdapClient, name = 'foo') {
    try {
        await client.add(`cn=${name},dc=example,dc=com`, {
            cn: name,
            sn: 'bar',
            mail: `${name}.bar@example.com`,
            objectClass: 'inetOrgPerson',
            userPassword: name,
        });
    } catch {
        // do nothing ;)
    }
}

export async function dropLdapTestUserAccount(client: ILdapClient, name = 'foo') {
    try {
        await client.del(`cn=${name},dc=example,dc=com`);
    } catch {
        // do nothing :)
    }
}

export function createLdapTestClientURL() {
    return `ldap://${inject('OPENLDAP_CONTAINER_HOST')}:${inject('OPENLDAP_CONTAINER_PORT')}`;
}

export function createLdapTestClient() : ILdapClient {
    return new LdapClient({
        url: createLdapTestClientURL(),
        user: 'cn=admin,dc=example,dc=com',
        password: 'password',
        baseDn: 'dc=example,dc=com',
    });
}
