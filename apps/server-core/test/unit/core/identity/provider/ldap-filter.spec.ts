/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAccount, LdapIdentityProvider, User } from '@authup/core-kit';
import { IdentityProviderProtocol } from '@authup/core-kit';
import type { SearchOptions } from 'ldapjs';
import { describe, expect, it } from 'vitest';
import type { IIdentityProviderAccountManager } from '../../../../../src/core/identity/provider/account/index.ts';
import { IdentityProviderLdapAuthenticator } from '../../../../../src/core/identity/provider/authentication/protocols/ldap/module.ts';
import type { ILdapClient, ILdapClientFactory } from '../../../../../src/core/ldap/index.ts';

function createAuthenticator(
    provider: Partial<LdapIdentityProvider>,
    entries: Record<string, any>[],
) {
    const filters : any[] = [];

    const client : ILdapClient = {
        connected: true,
        connect: async () => undefined,
        bind: async () => undefined,
        unbind: async () => undefined,
        add: async () => undefined,
        del: async () => undefined,
        search: async (options: SearchOptions) => {
            filters.push(options.filter);
            return filters.length === 1 ? entries : [];
        },
        resolveDn: (...input) => input.find((el) => !!el),
        isDn: () => true,
    };

    const clientFactory : ILdapClientFactory = { create: () => client };

    const accountManager : IIdentityProviderAccountManager = {
        save: async () => ({ user: { id: 'user' } as User } as IdentityProviderAccount),
        link: async () => ({} as IdentityProviderAccount),
    };

    const authenticator = new IdentityProviderLdapAuthenticator({
        provider: {
            protocol: IdentityProviderProtocol.LDAP,
            url: 'ldap://localhost',
            baseDn: 'dc=example,dc=com',
            ...provider,
        } as LdapIdentityProvider,
        clientFactory,
        accountManager,
    });

    return { authenticator, filters };
}

/**
 * The value a leaf of the filter puts on the wire. ldapjs sends a filter
 * object's leaf values verbatim, so this is what the directory compares.
 */
function wireValue(filter: any) : string {
    const { buffer } = filter.toBer();
    return buffer.subarray(buffer.length - Buffer.byteLength(filter.value)).toString();
}

describe('core/identity/provider/ldap — search filter', () => {
    it('should put the name into the user filter as a value, never as syntax', async () => {
        const { authenticator, filters } = createAuthenticator({ userFilter: '(&(objectClass=person)(uid={{input}}))' }, []);

        await expect(authenticator.authenticate('alice)(description=S*\\', 'pw')).rejects.toThrow();

        const [objectClass, uid] = filters[0].clauses;
        expect(filters[0].clauses).toHaveLength(2);
        expect(objectClass.value).toEqual('person');
        expect(uid.attribute).toEqual('uid');
        expect(wireValue(uid)).toEqual('alice)(description=S*\\');
    });

    it('should fill the operator attribute names into the template', async () => {
        const { authenticator, filters } = createAuthenticator({
            userFilter: '({{name_attribute}}={{input}})',
            userNameAttribute: 'sAMAccountName',
        }, []);

        await expect(authenticator.authenticate('alice', 'pw')).rejects.toThrow();

        expect(filters[0].attribute).toEqual('sAMAccountName');
        expect(filters[0].value).toEqual('alice');
    });

    it('should put a substituted value into a substring as a literal', async () => {
        const { authenticator, filters } = createAuthenticator({ userFilter: '(uid={{input}}*)' }, []);

        await expect(authenticator.authenticate('a*b', 'pw')).rejects.toThrow();

        expect(filters[0].initial).toEqual('a*b');
        expect(filters[0].any).toEqual([]);
    });

    it.each([
        'cn=Smith\\, John,dc=example,dc=com',
        'cn=J\\c3\\bcrgen,dc=example,dc=com',
        'cn=a*b(c),dc=example,dc=com',
    ])('should send the entry value %s unchanged in a group filter', async (dn) => {
        const { authenticator, filters } = createAuthenticator({
            userFilter: '(uid={{input}})',
            groupFilter: '(&(objectClass=group)(member={{dn}}))',
        }, [{ dn, uid: 'alice' }]);

        await authenticator.authenticate('alice', 'pw');

        const member = filters[1].clauses[1];
        expect(member.attribute).toEqual('member');
        expect(wireValue(member)).toEqual(dn);
    });
});
