/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { OAuth2IdentityProvider } from '@authup/core-kit';
import { IdentityProviderProtocol } from '@authup/core-kit';
import { describe, expect, it } from 'vitest';
import { IdentityProviderOAuth2Authenticator } from '../../../../../src/core/identity/provider/authentication/protocols/oauth2/module.ts';
import type { IIdentityProviderAccountManager } from '../../../../../src/core/identity/provider/account/types.ts';

function buildAuthorizeURL(baseURL: string) : URL {
    const provider = {
        id: randomUUID(),
        name: 'upstream',
        protocol: IdentityProviderProtocol.OAUTH2,
        enabled: true,
        realmId: null,
        clientId: 'client',
        clientSecret: 'secret',
        authorizeUrl: 'https://provider.example.com/authorize',
        tokenUrl: 'https://provider.example.com/token',
        scope: 'openid',
    } as unknown as OAuth2IdentityProvider;

    const authenticator = new IdentityProviderOAuth2Authenticator({
        options: { baseURL },
        accountManager: {} as IIdentityProviderAccountManager,
        provider,
    });

    return new URL(authenticator.buildRedirectURL({ state: 'state-value' }));
}

/**
 * The provider redirects the browser back to this URL, so a malformed one
 * ends the login on a 404 after the person has already authenticated. It is
 * built from `publicUrl`, which operators write with and without a trailing
 * slash; a template literal produced `//identity-providers/...` for the
 * former, which the router does not match.
 */
describe('core/identity/provider — callback redirect_uri', () => {
    it.each([
        ['http://127.0.0.1:3001', '/identity-providers/'],
        ['http://127.0.0.1:3001/', '/identity-providers/'],
        ['https://example.com/auth', '/auth/identity-providers/'],
        ['https://example.com/auth/', '/auth/identity-providers/'],
    ])('should build a single-slashed callback for %s', (baseURL, expected) => {
        const redirectUri = new URL(buildAuthorizeURL(baseURL).searchParams.get('redirect_uri') as string);

        expect(redirectUri.pathname.startsWith(expected)).toBe(true);
        expect(redirectUri.pathname).not.toContain('//');
        expect(redirectUri.pathname.endsWith('/authorize-in')).toBe(true);
    });
});
