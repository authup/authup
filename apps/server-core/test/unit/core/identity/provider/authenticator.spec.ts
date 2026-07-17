/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { describe, expect, it } from 'vitest';
import type { OAuth2IdentityProvider, OpenIDIdentityProvider, Realm } from '@authup/core-kit';
import { IdentityProviderProtocol } from '@authup/core-kit';
import { createNanoID } from '@authup/kit';
import { ValidationError, isValidationError } from '@authup/errors';
import type { IIdentityProviderAccountManager } from '../../../../../src/core';
import {
    IdentityProviderGoogleAuthenticator,
    IdentityProviderOAuth2Authenticator,
    IdentityProviderOpenIDAuthenticator,
} from '../../../../../src/core';

function createProvider(data: Partial<OAuth2IdentityProvider> = {}) : OAuth2IdentityProvider {
    const realm: Realm = {
        id: createNanoID(),
        name: 'master',
        displayName: null,
        description: null,
        builtIn: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    return {
        id: createNanoID(),
        name: 'idp',
        displayName: null,
        protocol: IdentityProviderProtocol.OAUTH2,
        preset: null,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        realmId: realm.id,
        realm,
        clientId: 'client-id',
        clientSecret: 'client-secret',
        tokenUrl: 'https://idp.example.com/token',
        authorizeUrl: 'https://idp.example.com/authorize',
        ...data,
    };
}

function createOpenIDProvider(data: Partial<OpenIDIdentityProvider> = {}) : OpenIDIdentityProvider {
    return {
        ...createProvider(),
        protocol: IdentityProviderProtocol.OIDC,
        ...data,
    };
}

function createAuthenticatorContext(provider: OAuth2IdentityProvider | OpenIDIdentityProvider) {
    return {
        options: { baseURL: 'https://authup.example.com/' },
        accountManager: {} as IIdentityProviderAccountManager,
        provider,
    };
}

function createAuthenticator(authorizeURL: string) {
    return new IdentityProviderOAuth2Authenticator(
        createAuthenticatorContext(createProvider({ authorizeUrl: authorizeURL })),
    );
}

describe('IdentityProviderOAuth2Authenticator', () => {
    it('should build a redirect url for a valid authorize url', () => {
        const authenticator = createAuthenticator('https://idp.example.com/authorize');

        const url = authenticator.buildRedirectURL({ state: 'abc' });

        const parsed = new URL(url);
        expect(parsed.origin).toEqual('https://idp.example.com');
        expect(parsed.searchParams.get('state')).toEqual('abc');
    });

    it('should throw a ValidationError for a missing authorize url', () => {
        const authenticator = createAuthenticator('');

        expect(() => authenticator.buildRedirectURL({ state: 'abc' }))
            .toThrow(ValidationError);
    });

    it('should throw a ValidationError for a malformed authorize url', () => {
        const authenticator = createAuthenticator('not-a-valid-url');

        try {
            authenticator.buildRedirectURL({ state: 'abc' });
            expect.fail('Expected buildRedirectURL to throw');
        } catch (e) {
            expect(isValidationError(e)).toBeTruthy();
        }
    });

    it('should forward the configured scope to the redirect url', () => {
        const authenticator = new IdentityProviderOAuth2Authenticator(
            createAuthenticatorContext(createProvider({ scope: 'foo bar' })),
        );

        const parsed = new URL(authenticator.buildRedirectURL({ state: 'abc' }));
        expect(parsed.searchParams.get('scope')).toEqual('foo bar');
    });

    it('should not send a scope parameter when no scope is configured', () => {
        const authenticator = new IdentityProviderOAuth2Authenticator(
            createAuthenticatorContext(createProvider({ scope: null })),
        );

        const parsed = new URL(authenticator.buildRedirectURL({ state: 'abc' }));
        expect(parsed.searchParams.get('scope')).toBeNull();
    });
});

describe('IdentityProviderOpenIDAuthenticator', () => {
    it('should default to the openid scopes when no scope is configured', () => {
        const authenticator = new IdentityProviderOpenIDAuthenticator(
            createAuthenticatorContext(createOpenIDProvider()),
        );

        const parsed = new URL(authenticator.buildRedirectURL({ state: 'abc' }));
        expect(parsed.searchParams.get('scope')).toEqual('openid profile email');
    });

    it('should keep a user-defined scope', () => {
        const authenticator = new IdentityProviderOpenIDAuthenticator(
            createAuthenticatorContext(createOpenIDProvider({ scope: 'openid custom' })),
        );

        const parsed = new URL(authenticator.buildRedirectURL({ state: 'abc' }));
        expect(parsed.searchParams.get('scope')).toEqual('openid custom');
    });

    it('should enforce the openid scope on a user-defined scope', () => {
        const authenticator = new IdentityProviderOpenIDAuthenticator(
            createAuthenticatorContext(createOpenIDProvider({ scope: 'profile custom' })),
        );

        const parsed = new URL(authenticator.buildRedirectURL({ state: 'abc' }));
        expect(parsed.searchParams.get('scope')).toEqual('openid profile custom');
    });
});

describe('IdentityProviderGoogleAuthenticator', () => {
    it('should default to the preset scope when no scope is configured', () => {
        const authenticator = new IdentityProviderGoogleAuthenticator(
            createAuthenticatorContext(createProvider()),
        );

        const parsed = new URL(authenticator.buildRedirectURL({ state: 'abc' }));
        expect(parsed.origin).toEqual('https://accounts.google.com');
        expect(parsed.searchParams.get('scope')).toEqual('openid profile email');
    });

    it('should merge a user-defined scope with the preset scopes', () => {
        const authenticator = new IdentityProviderGoogleAuthenticator(
            createAuthenticatorContext(createProvider({ scope: 'https://www.googleapis.com/auth/calendar.readonly' })),
        );

        const parsed = new URL(authenticator.buildRedirectURL({ state: 'abc' }));
        expect(parsed.searchParams.get('scope'))
            .toEqual('openid profile email https://www.googleapis.com/auth/calendar.readonly');
    });
});
