/*
 * Copyright (c) 2024-2026.
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
import type { Client, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import {
    OAuth2AuthorizationCodeChallengeMethod,
    OAuth2AuthorizationResponseType,
    OAuth2ErrorCode,
} from '@authup/specs';
import { ErrorCode } from '@authup/errors';
import { isClientError } from 'hapic';
import { buildOAuth2CodeChallenge, generateOAuth2CodeVerifier } from '../../../../../../src/core';
import { createFakeClient } from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

describe('grant-authorize', () => {
    let confidentialClient : Client;
    let confidentialSecret : string;

    let publicClient : Client;

    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();

        confidentialSecret = generateOAuth2CodeVerifier();
        confidentialClient = await suite.client
            .client
            .create(createFakeClient({
                secret: confidentialSecret,
                secret_hashed: false,
                secret_encrypted: false,
                is_confidential: true,
            }));

        const scope = await suite.client.scope.getOne(ScopeName.GLOBAL);
        await suite.client.clientScope.create({
            scope_id: scope.id,
            client_id: confidentialClient.id,
        });

        publicClient = await suite.client
            .client
            .create(createFakeClient({
                is_confidential: false,
                secret: null,
            }));

        await suite.client.clientScope.create({
            scope_id: scope.id,
            client_id: publicClient.id,
        });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should build oauth2 code challenge', async () => {
        const codeVerifier = 'Li5PBcECIXmMuuDsWHjexHnr6LNK6BWKKkcuJaAjeSkeux7p';
        const codeChallenge = await buildOAuth2CodeChallenge(codeVerifier);
        expect(codeChallenge).toEqual('lFtvTpirsB96UMQJgoRhKofsa0w7ShdPkJ3eJ6MgYVY');
    });

    it('should work with authorize grant for confidential client', async () => {
        const state = generateOAuth2CodeVerifier();
        const response = await suite.client
            .authorize
            .confirm({
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: confidentialClient.id,
                redirect_uri: 'https://example.com/redirect',
                scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
                state,
            });

        expect(response.url).toBeDefined();

        const url = new URL(response.url);
        expect(url.searchParams.get('access_token')).toBeFalsy();
        expect(url.searchParams.get('code')).toBeDefined();
        expect(url.searchParams.get('id_token')).toEqual(null);

        const code = url.searchParams.get('code')!;

        const tokenResponse = await suite.client
            .token
            .createWithAuthorizationCode({
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
                redirect_uri: 'https://example.com/redirect',
                code,
            });

        expect(tokenResponse).toBeDefined();
        expect(tokenResponse.access_token).toBeDefined();
        expect(tokenResponse.id_token).toBeDefined();
        expect(tokenResponse.expires_in).toBeDefined();
        expect(tokenResponse.refresh_token).toBeDefined();
    });

    it('should work with authorize grant and PKCE for confidential client', async () => {
        const state = generateOAuth2CodeVerifier();
        const codeVerifier = generateOAuth2CodeVerifier();
        const codeChallenge = await buildOAuth2CodeChallenge(codeVerifier);

        const payload : OAuth2AuthorizationCodeRequest = {
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: confidentialClient.id,
            redirect_uri: 'https://example.com/redirect',
            scope: `${ScopeName.GLOBAL}`,
            code_challenge: codeChallenge,
            code_challenge_method: OAuth2AuthorizationCodeChallengeMethod.SHA_256,
            state,
        };
        const response = await suite.client
            .authorize
            .confirm(payload);

        expect(response.url).toBeDefined();

        const url = new URL(response.url);
        const code = url.searchParams.get('code')!;

        const tokenResponse = await suite.client
            .token
            .createWithAuthorizationCode({
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
                redirect_uri: 'https://example.com/redirect',
                code,
                code_verifier: codeVerifier,
            });

        expect(tokenResponse).toBeDefined();
        expect(tokenResponse.access_token).toBeDefined();
    });

    it('should not work with authorize grant and invalid PKCE', async () => {
        const state = generateOAuth2CodeVerifier();
        const codeVerifier = generateOAuth2CodeVerifier();
        const codeChallenge = await buildOAuth2CodeChallenge(codeVerifier);

        const payload : OAuth2AuthorizationCodeRequest = {
            state,
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: confidentialClient.id,
            redirect_uri: 'https://example.com/redirect',
            scope: `${ScopeName.GLOBAL}`,
            code_challenge: codeChallenge,
            code_challenge_method: OAuth2AuthorizationCodeChallengeMethod.SHA_256,
        };

        const response = await suite.client
            .authorize
            .confirm(payload);

        expect(response.url).toBeDefined();

        const url = new URL(response.url);
        const code = url.searchParams.get('code')!;

        expect.assertions(3);

        try {
            await suite.client
                .token
                .createWithAuthorizationCode({
                    client_id: confidentialClient.id,
                    client_secret: confidentialSecret,
                    redirect_uri: 'https://example.com/redirect',
                    code,
                    code_verifier: generateOAuth2CodeVerifier(),
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.response?.data).toBeDefined();
                expect(e.response?.data?.code).toEqual(ErrorCode.OAUTH_GRANT_INVALID);
            }
        }
    });

    it('should reject token exchange when confidential client omits client_secret', async () => {
        const state = generateOAuth2CodeVerifier();
        const response = await suite.client
            .authorize
            .confirm({
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: confidentialClient.id,
                redirect_uri: 'https://example.com/redirect',
                scope: `${ScopeName.GLOBAL}`,
                state,
            });

        const url = new URL(response.url);
        const code = url.searchParams.get('code')!;

        expect.assertions(2);

        try {
            await suite.client
                .token
                .createWithAuthorizationCode({
                    client_id: confidentialClient.id,
                    redirect_uri: 'https://example.com/redirect',
                    code,
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.response?.data?.code).toEqual(ErrorCode.OAUTH_CLIENT_INVALID);
                expect(e.response?.data?.error).toEqual(OAuth2ErrorCode.INVALID_CLIENT);
            }
        }
    });

    it('should reject token exchange when confidential client provides wrong client_secret', async () => {
        const state = generateOAuth2CodeVerifier();
        const response = await suite.client
            .authorize
            .confirm({
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: confidentialClient.id,
                redirect_uri: 'https://example.com/redirect',
                scope: `${ScopeName.GLOBAL}`,
                state,
            });

        const url = new URL(response.url);
        const code = url.searchParams.get('code')!;

        expect.assertions(1);

        try {
            await suite.client
                .token
                .createWithAuthorizationCode({
                    client_id: confidentialClient.id,
                    client_secret: 'wrong-secret',
                    redirect_uri: 'https://example.com/redirect',
                    code,
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.response?.data?.code).toEqual(ErrorCode.OAUTH_CLIENT_INVALID);
            }
        }
    });

    it('should reject token exchange when authenticated client_id does not match the code', async () => {
        const state = generateOAuth2CodeVerifier();
        const response = await suite.client
            .authorize
            .confirm({
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: confidentialClient.id,
                redirect_uri: 'https://example.com/redirect',
                scope: `${ScopeName.GLOBAL}`,
                state,
            });

        const url = new URL(response.url);
        const code = url.searchParams.get('code')!;

        const otherSecret = generateOAuth2CodeVerifier();
        const otherClient = await suite.client
            .client
            .create(createFakeClient({
                secret: otherSecret,
                secret_hashed: false,
                secret_encrypted: false,
                is_confidential: true,
            }));

        expect.assertions(1);

        try {
            await suite.client
                .token
                .createWithAuthorizationCode({
                    client_id: otherClient.id,
                    client_secret: otherSecret,
                    redirect_uri: 'https://example.com/redirect',
                    code,
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.response?.data?.code).toEqual(ErrorCode.OAUTH_GRANT_INVALID);
            }
        }
    });

    it('should reject /authorize for public client without code_challenge', async () => {
        const state = generateOAuth2CodeVerifier();

        expect.assertions(1);

        try {
            await suite.client
                .authorize
                .confirm({
                    response_type: OAuth2AuthorizationResponseType.CODE,
                    client_id: publicClient.id,
                    redirect_uri: 'https://example.com/redirect',
                    scope: `${ScopeName.GLOBAL}`,
                    state,
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.response?.data?.error).toEqual(OAuth2ErrorCode.INVALID_REQUEST);
            }
        }
    });

    it('should reject token exchange when client credentials are sent via both Basic header and body', async () => {
        const state = generateOAuth2CodeVerifier();
        const response = await suite.client
            .authorize
            .confirm({
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: confidentialClient.id,
                redirect_uri: 'https://example.com/redirect',
                scope: `${ScopeName.GLOBAL}`,
                state,
            });

        const url = new URL(response.url);
        const code = url.searchParams.get('code')!;

        // hapic's TokenAPI deletes the Authorization header by default; bypass
        // the typed client and send raw to exercise the dual-method path.
        const basic = Buffer
            .from(`${confidentialClient.id}:${confidentialSecret}`)
            .toString('base64');
        const tokenResponse = await fetch(`${suite.baseURL}/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${basic}`,
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: 'https://example.com/redirect',
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
            }).toString(),
        });

        expect(tokenResponse.status).toEqual(400);
        const body = await tokenResponse.json() as { error?: string };
        expect(body.error).toEqual(OAuth2ErrorCode.INVALID_REQUEST);
    });

    it('should work with authorize grant + PKCE for public client (no client_secret)', async () => {
        const state = generateOAuth2CodeVerifier();
        const codeVerifier = generateOAuth2CodeVerifier();
        const codeChallenge = await buildOAuth2CodeChallenge(codeVerifier);

        const response = await suite.client
            .authorize
            .confirm({
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: publicClient.id,
                redirect_uri: 'https://example.com/redirect',
                scope: `${ScopeName.GLOBAL}`,
                code_challenge: codeChallenge,
                code_challenge_method: OAuth2AuthorizationCodeChallengeMethod.SHA_256,
                state,
            });

        const url = new URL(response.url);
        const code = url.searchParams.get('code')!;

        const tokenResponse = await suite.client
            .token
            .createWithAuthorizationCode({
                client_id: publicClient.id,
                redirect_uri: 'https://example.com/redirect',
                code,
                code_verifier: codeVerifier,
            });

        expect(tokenResponse.access_token).toBeDefined();
    });
});
