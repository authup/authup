/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAccount, LdapIdentityProvider, User } from '@authup/core-kit';
import { IdentityProviderProtocol } from '@authup/core-kit';
import { EntityCredentialsInvalidError } from '@authup/errors';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type { IIdentityProviderRepository } from '../../../../../src/core/entities/index.ts';
import type { IIdentityProviderAccountManager } from '../../../../../src/core/identity/provider/account/index.ts';
import { IdentityProviderLdapCollectionAuthenticator } from '../../../../../src/core/identity/provider/authentication/protocols/ldap/collection.ts';
import { IdentityProviderLdapAuthenticator } from '../../../../../src/core/identity/provider/authentication/protocols/ldap/module.ts';
import type { ILdapClient, ILdapClientFactory } from '../../../../../src/core/ldap/index.ts';

function createProvider(id: string, enabled = true) : LdapIdentityProvider {
    return {
        id,
        enabled,
        protocol: IdentityProviderProtocol.LDAP,
        url: 'ldap://localhost',
        baseDn: 'dc=example,dc=com',
    } as LdapIdentityProvider;
}

function createContext(providers: LdapIdentityProvider[]) {
    const user = { id: 'user' } as User;
    const entry = { dn: 'cn=alice,dc=example,dc=com', cn: 'alice' };
    const client = {
        connected: true,
        connect: vi.fn(),
        bind: vi.fn(),
        unbind: vi.fn(),
        add: vi.fn(),
        del: vi.fn(),
        search: vi.fn().mockResolvedValueOnce([entry]).mockResolvedValue([]),
        resolveDn: (...input: string[]) => input.find((el) => !!el),
        isDn: () => true,
    } satisfies ILdapClient;
    const clientFactory = { create: vi.fn(() => client) } satisfies ILdapClientFactory;
    const accountManager = {
        save: vi.fn().mockResolvedValue({ user } as IdentityProviderAccount),
        link: vi.fn(),
    } satisfies IIdentityProviderAccountManager;
    const repository = { findByProtocol: vi.fn().mockResolvedValue(providers) } as unknown as IIdentityProviderRepository;

    return {
        user,
        client,
        clientFactory,
        accountManager,
        repository,
    };
}

describe('core/identity/provider/ldap-authentication', () => {
    it('rejects a disabled single provider without binding or mutating an account', async () => {
        const provider = createProvider('disabled', false);
        const ctx = createContext([provider]);
        const authenticator = new IdentityProviderLdapAuthenticator({ ...ctx, provider });

        await expect(authenticator.authenticate('alice', 'password')).rejects.toBeInstanceOf(EntityCredentialsInvalidError);
        expect(ctx.client.bind).not.toHaveBeenCalled();
        expect(ctx.client.search).not.toHaveBeenCalled();
        expect(ctx.client.unbind).not.toHaveBeenCalled();
        expect(ctx.accountManager.save).not.toHaveBeenCalled();
        expect(ctx.accountManager.link).not.toHaveBeenCalled();
    });

    it('authenticates and saves an account for an enabled single provider', async () => {
        const provider = createProvider('enabled');
        const ctx = createContext([provider]);
        const authenticator = new IdentityProviderLdapAuthenticator({ ...ctx, provider });

        await expect(authenticator.authenticate('alice', 'password')).resolves.toBe(ctx.user);
        expect(ctx.client.bind).toHaveBeenCalledWith('cn=alice,dc=example,dc=com', 'password');
        expect(ctx.accountManager.save).toHaveBeenCalledWith(expect.objectContaining({ provider }));
    });

    it('rejects a collection of disabled providers without creating clients or mutating accounts', async () => {
        const ctx = createContext([createProvider('disabled', false)]);
        const authenticator = new IdentityProviderLdapCollectionAuthenticator(ctx);

        await expect(authenticator.authenticate('alice', 'password')).rejects.toBeInstanceOf(EntityCredentialsInvalidError);
        expect(ctx.clientFactory.create).not.toHaveBeenCalled();
        expect(ctx.client.bind).not.toHaveBeenCalled();
        expect(ctx.accountManager.save).not.toHaveBeenCalled();
        expect(ctx.accountManager.link).not.toHaveBeenCalled();
    });

    it('skips disabled providers and authenticates with the next enabled provider', async () => {
        const enabled = createProvider('enabled');
        const ctx = createContext([createProvider('disabled', false), enabled]);
        const authenticator = new IdentityProviderLdapCollectionAuthenticator(ctx);

        await expect(authenticator.authenticate('alice', 'password', 'realm')).resolves.toBe(ctx.user);
        expect(ctx.repository.findByProtocol).toHaveBeenCalledWith(IdentityProviderProtocol.LDAP, 'realm');
        expect(ctx.clientFactory.create).toHaveBeenCalledTimes(1);
        expect(ctx.accountManager.save).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ provider: enabled }));
    });

    it('continues to the next enabled provider when authentication fails', async () => {
        const enabled = createProvider('enabled');
        const ctx = createContext([createProvider('failed'), createProvider('disabled', false), enabled]);

        ctx.client.bind.mockRejectedValueOnce(new Error('LDAP bind failed'));

        const authenticator = new IdentityProviderLdapCollectionAuthenticator(ctx);

        await expect(authenticator.authenticate('alice', 'password')).resolves.toBe(ctx.user);
        expect(ctx.clientFactory.create).toHaveBeenCalledTimes(2);
        expect(ctx.accountManager.save).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ provider: enabled }));
    });
});
