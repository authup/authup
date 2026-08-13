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
import type { TokenGrantResponse } from '@hapic/oauth2';
import type { IIdentityProviderAccountManager, IdentityProviderIdentity } from '../../../../../src/core';
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

const encodeSegment = (input: Record<string, any>) => Buffer.from(JSON.stringify(input)).toString('base64url');

const encodeToken = (claims: Record<string, any>) => [
    encodeSegment({ alg: 'none', typ: 'JWT' }),
    encodeSegment(claims),
    'x',
].join('.');

/**
 * `buildIdentityWithTokenGrantResponse` is protected, and it is the whole
 * subject of #3434 — the claim-to-candidate mapping had no coverage at all.
 */
class TestableAuthenticator extends IdentityProviderOAuth2Authenticator {
    buildIdentity(input: TokenGrantResponse) : Promise<IdentityProviderIdentity> {
        return this.buildIdentityWithTokenGrantResponse(input);
    }

    stubUserInfo(claims: Record<string, any>) {
        this.client.userInfo.get = () => Promise.resolve(claims);
    }

    failUserInfo(error: Error) {
        this.client.userInfo.get = () => Promise.reject(error);
    }
}

function createTestableAuthenticator(provider: Partial<OAuth2IdentityProvider> = {}) {
    return new TestableAuthenticator(createAuthenticatorContext(createProvider(provider)));
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

/**
 * #3434 — a federated user used to be provisioned under the remote subject
 * UUID, because the identity was derived from the access token alone. An
 * access token is opaque by contract, and authup's carries `sub`, `kind` and
 * `realm_name` and no username at all.
 */
describe('IdentityProviderOAuth2Authenticator (identity build)', () => {
    // what an authup access token actually looks like
    const ACCESS_TOKEN = encodeToken({
        sub: 'external-user-1',
        kind: 'access_token',
        realm_name: 'master',
    });

    it('should fall back to the subject when nothing richer is offered', async () => {
        const identity = await createTestableAuthenticator()
            .buildIdentity({ access_token: ACCESS_TOKEN } as TokenGrantResponse);

        expect(identity.id).toEqual('external-user-1');
        expect(identity.attributeCandidates.name).toEqual([
            undefined,
            undefined,
            undefined,
            'external-user-1',
        ]);
    });

    it('should read the authup id_token `name` claim ahead of the subject', async () => {
        // preferred_username / nickname both map to the NULLABLE displayName
        // in authup's own claims builder, so a ladder without `name` still
        // lands on the subject — which is the reported bug
        const identity = await createTestableAuthenticator().buildIdentity({
            access_token: ACCESS_TOKEN,
            id_token: encodeToken({
                sub: 'external-user-1',
                preferred_username: null,
                nickname: null,
                name: 'peter',
                email: 'peter@example.com',
            }),
        } as TokenGrantResponse);

        expect(identity.attributeCandidates.name).toEqual([
            null,
            null,
            'peter',
            'external-user-1',
        ]);
        expect(identity.attributeCandidates.email).toEqual(['peter@example.com']);
    });

    it('should prefer preferred_username, the keycloak-style username', async () => {
        const identity = await createTestableAuthenticator().buildIdentity({
            access_token: ACCESS_TOKEN,
            id_token: encodeToken({
                preferred_username: 'kc-user',
                name: 'Peter Placzek',
            }),
        } as TokenGrantResponse);

        expect(identity.attributeCandidates.name?.[0]).toEqual('kc-user');
    });

    it('should key the account on the access token subject, never the id_token', async () => {
        // provider_user_id keys findOneByProviderIdentity: sourcing it from a
        // richer claim set would orphan every existing account row
        const identity = await createTestableAuthenticator().buildIdentity({
            access_token: ACCESS_TOKEN,
            id_token: encodeToken({ sub: 'a-different-subject', name: 'peter' }),
        } as TokenGrantResponse);

        expect(identity.id).toEqual('external-user-1');
    });

    it('should ignore an id_token it cannot decode', async () => {
        // a five-segment JWE was ignored outright before it was read at all
        const identity = await createTestableAuthenticator().buildIdentity({
            access_token: ACCESS_TOKEN,
            id_token: 'a.b.c.d.e',
        } as TokenGrantResponse);

        expect(identity.id).toEqual('external-user-1');
        expect(identity.attributeCandidates.name?.[3]).toEqual('external-user-1');
    });

    it('should not call userinfo when the provider declares no endpoint', async () => {
        // the guard is load-bearing: the client carries no baseURL, so
        // hapic's `/userinfo` default would be a relative fetch URL
        const authenticator = createTestableAuthenticator();
        authenticator.failUserInfo(new Error('userinfo must not be called'));

        const identity = await authenticator.buildIdentity({ access_token: ACCESS_TOKEN } as TokenGrantResponse);

        expect(identity.id).toEqual('external-user-1');
    });

    it('should let userinfo claims win over the id_token', async () => {
        const authenticator = createTestableAuthenticator({ userInfoUrl: 'https://idp.example.com/userinfo' });
        authenticator.stubUserInfo({ preferred_username: 'userinfo-user' });

        const identity = await authenticator.buildIdentity({
            access_token: ACCESS_TOKEN,
            id_token: encodeToken({ name: 'id-token-user' }),
        } as TokenGrantResponse);

        expect(identity.attributeCandidates.name?.[0]).toEqual('userinfo-user');
    });

    it('should discard a userinfo document whose subject does not match', async () => {
        // OIDC Core 5.3.2. A mis-routed response (a multi-tenant gateway, a
        // token mix-up) would otherwise name AND email the local user after
        // somebody else, and `auth_users.email` carries no unique constraint,
        // so that third party could then drive password recovery on it.
        const authenticator = createTestableAuthenticator({ userInfoUrl: 'https://idp.example.com/userinfo' });
        authenticator.stubUserInfo({
            sub: 'somebody-else',
            preferred_username: 'somebody-else',
            email: 'somebody-else@example.com',
        });

        const identity = await authenticator.buildIdentity({
            access_token: ACCESS_TOKEN,
            id_token: encodeToken({ name: 'id-token-user', email: 'peter@example.com' }),
        } as TokenGrantResponse);

        expect(identity.attributeCandidates.name).not.toContain('somebody-else');
        expect(identity.attributeCandidates.email).toEqual(['peter@example.com']);
    });

    it('should read an id_token whose claims are not ASCII', async () => {
        // base64URL (`-`/`_`) plus UTF-8, both of which the previous `atob`
        // decode rejected outright, so the enrichment silently no-opped for
        // exactly the users most likely to carry a non-ASCII display name
        const identity = await createTestableAuthenticator().buildIdentity({
            access_token: ACCESS_TOKEN,
            id_token: encodeToken({
                preferred_username: 'Пётр',
                name: 'Peter 😀',
                email: 'peter@example.com',
            }),
        } as TokenGrantResponse);

        expect(identity.attributeCandidates.name?.[0]).toEqual('Пётр');
        expect(identity.attributeCandidates.name?.[2]).toEqual('Peter 😀');
    });

    it('should degrade rather than fail the login when userinfo errors', async () => {
        const authenticator = createTestableAuthenticator({ userInfoUrl: 'https://idp.example.com/userinfo' });
        authenticator.failUserInfo(new Error('gateway timeout'));

        const identity = await authenticator.buildIdentity({
            access_token: ACCESS_TOKEN,
            id_token: encodeToken({ name: 'id-token-user' }),
        } as TokenGrantResponse);

        expect(identity.attributeCandidates.name?.[2]).toEqual('id-token-user');
    });
});
