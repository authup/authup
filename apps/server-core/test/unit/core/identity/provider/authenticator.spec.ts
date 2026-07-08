/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { describe, expect, it } from 'vitest';
import type { OAuth2IdentityProvider } from '@authup/core-kit';
import { IdentityProviderProtocol } from '@authup/core-kit';
import { createNanoID } from '@authup/kit';
import { BadRequestError, isBadRequestError } from '@authup/errors';
import type { IIdentityProviderAccountManager } from '../../../../../src/core';
import { IdentityProviderOAuth2Authenticator } from '../../../../../src/core';

function createAuthenticator(authorizeURL: unknown) {
    const provider = {
        id: createNanoID(),
        protocol: IdentityProviderProtocol.OAUTH2,
        client_id: 'client-id',
        client_secret: 'client-secret',
        token_url: 'https://idp.example.com/token',
        authorize_url: authorizeURL,
    } as OAuth2IdentityProvider;

    return new IdentityProviderOAuth2Authenticator({
        options: { baseURL: 'https://authup.example.com/' },
        accountManager: {} as IIdentityProviderAccountManager,
        provider,
    });
}

describe('IdentityProviderOAuth2Authenticator', () => {
    it('should build a redirect url for a valid authorize url', () => {
        const authenticator = createAuthenticator('https://idp.example.com/authorize');

        const url = authenticator.buildRedirectURL({ state: 'abc' });

        const parsed = new URL(url);
        expect(parsed.origin).toEqual('https://idp.example.com');
        expect(parsed.searchParams.get('state')).toEqual('abc');
    });

    it('should throw a BadRequestError for a missing authorize url', () => {
        const authenticator = createAuthenticator('');

        expect(() => authenticator.buildRedirectURL({ state: 'abc' }))
            .toThrow(BadRequestError);
    });

    it('should throw a BadRequestError for a malformed authorize url', () => {
        const authenticator = createAuthenticator('not-a-valid-url');

        try {
            authenticator.buildRedirectURL({ state: 'abc' });
            expect.fail('Expected buildRedirectURL to throw');
        } catch (e) {
            expect(isBadRequestError(e)).toBeTruthy();
        }
    });
});
