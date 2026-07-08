/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import type { Client } from '@authup/core-kit';
import { REALM_MASTER_NAME, ScopeName } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import {
    OAuth2AuthorizationCodeChallengeMethod,
    OAuth2AuthorizationResponseType,
    OAuth2TokenKind,
} from '@authup/specs';
import {
    buildOAuth2CodeChallenge,
    generateOAuth2CodeVerifier,
} from '../../../../../src/core';
import { createFakeClient, createFakeUser } from '../../../../utils';
import { createTestApplication } from '../../../../app';

// base64url-safe JWT payload decode (atob chokes on -/_).
function decodeJwtPayload(token: string): Record<string, any> {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
}

// A dependency-free OIDC conformance smoke: the discovery document must be
// well-formed (all required OP metadata present + typed), the JWKS must be
// well-formed, and the id_token from a full auth-code flow must carry the
// required claims consistent with discovery. (Chosen over an off-the-shelf RP
// library — openid-client — to avoid the lockfile churn and the brittleness of
// driving its browser-oriented flow headlessly; the assertions below are the
// same the RP lib would enforce.)
describe('OIDC conformance smoke', () => {
    const suite = createTestApplication();

    let discovery: Record<string, any>;

    beforeAll(async () => {
        await suite.setup();

        const response = await fetch(`${suite.baseURL}/realms/${REALM_MASTER_NAME}/.well-known/openid-configuration`);
        discovery = await response.json();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('advertises a well-formed discovery document', () => {
        // OIDC Discovery 1.0 §3 REQUIRED metadata
        const requiredStringFields = [
            'issuer',
            'authorization_endpoint',
            'token_endpoint',
            'jwks_uri',
            'userinfo_endpoint',
        ];
        for (const field of requiredStringFields) {
            expect(typeof discovery[field], field).toEqual('string');
            expect(discovery[field].length, field).toBeGreaterThan(0);
        }

        const requiredArrayFields = [
            'response_types_supported',
            'subject_types_supported',
            'id_token_signing_alg_values_supported',
        ];
        for (const field of requiredArrayFields) {
            expect(Array.isArray(discovery[field]), field).toBe(true);
            expect(discovery[field].length, field).toBeGreaterThan(0);
        }

        // spec-required values
        expect(discovery.response_types_supported).toContain('code');
        expect(discovery.subject_types_supported).toContain('public');

        // authup extensions (RP-initiated logout, RFC 7009 revocation, RFC 7662)
        expect(discovery.end_session_endpoint.endsWith('/logout')).toBe(true);
        expect(discovery.revocation_endpoint.endsWith('/token/revoke')).toBe(true);
        expect(discovery.introspection_endpoint.endsWith('/token/introspect')).toBe(true);
        expect(Array.isArray(discovery.prompt_values_supported)).toBe(true);
        expect(discovery.prompt_values_supported).toContain('select_account');

        // endpoints share the issuer origin
        const issuerOrigin = new URL(discovery.issuer).origin;
        expect(new URL(discovery.authorization_endpoint).origin).toEqual(issuerOrigin);
        expect(new URL(discovery.jwks_uri).origin).toEqual(issuerOrigin);
    });

    it('exposes a well-formed JWKS', async () => {
        // The realm signing key is created lazily on first sign, so force one
        // (a password login mints a master-realm access token) — otherwise the
        // key set is empty and the assertions below would be vacuous.
        const password = generateOAuth2CodeVerifier();
        const signer = await suite.client.user.create(createFakeUser({ password }));
        await suite.client.token.createWithPassword({ username: signer.name, password });

        // discovery endpoints are built from publicUrl (not the random test
        // port), so fetch the JWKS from the running test server directly.
        const response = await fetch(`${suite.baseURL}/realms/${REALM_MASTER_NAME}/jwks`);
        const body = await response.json() as { keys: Record<string, any>[] };

        expect(Array.isArray(body.keys)).toBe(true);
        expect(body.keys.length).toBeGreaterThan(0);
        for (const key of body.keys) {
            expect(typeof key.kty, 'kty').toEqual('string');
            expect(key.kty.length, 'kty').toBeGreaterThan(0);
        }
    });

    it('issues an id_token with the required claims, consistent with discovery', async () => {
        // full auth-code flow: password login → authorize → exchange
        const client: Client = await suite.client.client.create(createFakeClient({
            is_confidential: false,
            secret: null,
            redirect_uri: 'https://app.example.com/**',
        }));
        for (const scopeName of [ScopeName.GLOBAL, ScopeName.OPEN_ID]) {
            const scope = await suite.client.scope.getOne(scopeName);
            await suite.client.clientScope.create({ scope_id: scope.id, client_id: client.id });
        }

        const password = generateOAuth2CodeVerifier();
        const user = await suite.client.user.create(createFakeUser({ password }));

        const login = await suite.client.token.createWithPassword({ username: user.name, password });
        const userClient = new HTTPClient({ baseURL: suite.baseURL });
        userClient.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });

        const codeVerifier = generateOAuth2CodeVerifier();
        const codeChallenge = await buildOAuth2CodeChallenge(codeVerifier);
        const nonce = generateOAuth2CodeVerifier();
        const authorized = await userClient.authorize.confirm({
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: client.id,
            redirect_uri: 'https://app.example.com/cb',
            scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
            code_challenge: codeChallenge,
            code_challenge_method: OAuth2AuthorizationCodeChallengeMethod.SHA_256,
            state: generateOAuth2CodeVerifier(),
            nonce,
        });

        const code = new URL(authorized.url).searchParams.get('code')!;
        const tokens = await suite.client.token.createWithAuthorizationCode({
            client_id: client.id,
            redirect_uri: 'https://app.example.com/cb',
            code,
            code_verifier: codeVerifier,
        });

        expect(tokens.id_token).toBeDefined();
        const payload = decodeJwtPayload(tokens.id_token!) as OAuth2TokenPayload & {
            iss?: string, 
            aud?: string, 
            iat?: number 
        };

        // OIDC Core §2 REQUIRED id_token claims
        expect(payload.kind).toEqual(OAuth2TokenKind.ID_TOKEN);
        expect(typeof payload.iss).toEqual('string');
        expect(typeof payload.sub).toEqual('string');
        expect(typeof payload.exp).toEqual('number');
        expect(typeof payload.iat).toEqual('number');
        expect(payload.exp!).toBeGreaterThan(payload.iat!);

        // consistency with discovery + the requesting client
        expect(payload.iss).toEqual(discovery.issuer);
        expect(payload.aud).toEqual(client.id);
        expect(payload.nonce).toEqual(nonce);

        // authup id_token additions (auth_time + sid)
        expect(typeof payload.auth_time).toEqual('number');
        expect(typeof payload.sid).toEqual('string');

        // the co-issued access token is signature-valid (works on a protected
        // endpoint) — proving the realm signing key behind the id_token is sound
        const meClient = new HTTPClient({ baseURL: suite.baseURL });
        meClient.setAuthorizationHeader({ type: 'Bearer', token: tokens.access_token });
        const me = await meClient.userInfo.get();
        expect(me).toBeDefined();
    });
});
