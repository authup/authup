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
    const filters : string[] = [];

    const client : ILdapClient = {
        connected: true,
        connect: async () => undefined,
        bind: async () => undefined,
        unbind: async () => undefined,
        add: async () => undefined,
        del: async () => undefined,
        search: async (options: SearchOptions) => {
            filters.push(String(options.filter));
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

describe('core/identity/provider/ldap — search filter', () => {
    it('should escape the name in a user filter template', async () => {
        const { authenticator, filters } = createAuthenticator({ userFilter: '(&(objectClass=person)(uid={{input}}))' }, []);

        await expect(authenticator.authenticate('alice)(description=S*', 'pw')).rejects.toThrow();

        expect(filters[0]).toEqual('(&(objectClass=person)(uid=alice\\29\\28description=S\\2a))');
    });

    it('should escape the entry values in a group filter template', async () => {
        const { authenticator, filters } = createAuthenticator({
            userFilter: '(uid={{input}})',
            groupFilter: '(&(objectClass=group)(member={{dn}}))',
        }, [{ dn: 'cn=a*b(c),dc=example,dc=com', uid: 'alice' }]);

        await authenticator.authenticate('alice', 'pw');

        expect(filters[1]).toEqual('(&(objectClass=group)(member=cn=a\\2ab\\28c\\29,dc=example,dc=com))');
    });
});
