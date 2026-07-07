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
import type { Client, OAuth2AuthorizationCodeRequest, Realm } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import {
    OAuth2AuthorizationCodeChallengeMethod,
    OAuth2AuthorizationResponseType,
    OAuth2ErrorCode,
} from '@authup/specs';
import { ErrorCode } from '@authup/errors';
import { buildOAuth2CodeChallenge, generateOAuth2CodeVerifier } from '../../../../../../src/core';
import {
    createFakeClient,
    createFakeRealm,
    createFakeUser,
    expectClientError,
    httpRequest,
} from '../../../../../utils';
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

    // Authorize now requires the acting user's realm to match the client realm,
    // so a code for a non-master-realm client must be issued by a user in that
    // realm (not the master admin). Creates a realm user, logs in, and returns
    // an HTTP client bound to that user's bearer token.
    const loginAsRealmUser = async (realm: Realm): Promise<HTTPClient> => {
        const password = generateOAuth2CodeVerifier();
        const user = await suite.client.user.create(createFakeUser({
            realm_id: realm.id,
            password,
        }));

        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
            realm_id: realm.id,
        });

        const userClient = new HTTPClient({ baseURL: suite.baseURL });
        userClient.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });
        return userClient;
    };

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

        await expectClientError(
            () => suite.client.token.createWithAuthorizationCode({
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
                redirect_uri: 'https://example.com/redirect',
                code,
                code_verifier: generateOAuth2CodeVerifier(),
            }),
            { status: 400, code: ErrorCode.OAUTH_GRANT_INVALID },
        );
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

        await expectClientError(
            () => suite.client.token.createWithAuthorizationCode({
                client_id: confidentialClient.id,
                redirect_uri: 'https://example.com/redirect',
                code,
            }),
            {
                status: 401,
                code: ErrorCode.OAUTH_CLIENT_INVALID,
                data: { error: OAuth2ErrorCode.INVALID_CLIENT },
            },
        );
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

        await expectClientError(
            () => suite.client.token.createWithAuthorizationCode({
                client_id: confidentialClient.id,
                client_secret: 'wrong-secret',
                redirect_uri: 'https://example.com/redirect',
                code,
            }),
            { status: 401, code: ErrorCode.OAUTH_CLIENT_INVALID },
        );
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

        await expectClientError(
            () => suite.client.token.createWithAuthorizationCode({
                client_id: otherClient.id,
                client_secret: otherSecret,
                redirect_uri: 'https://example.com/redirect',
                code,
            }),
            { status: 400, code: ErrorCode.OAUTH_GRANT_INVALID },
        );
    });

    it('should reject /authorize for public client without code_challenge', async () => {
        const state = generateOAuth2CodeVerifier();

        await expectClientError(
            () => suite.client.authorize.confirm({
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: publicClient.id,
                redirect_uri: 'https://example.com/redirect',
                scope: `${ScopeName.GLOBAL}`,
                state,
            }),
            { data: { error: OAuth2ErrorCode.INVALID_REQUEST } },
        );
    });

    it('should reject token exchange when client_secret is provided without client_id', async () => {
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

        const tokenResponse = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'authorization_code',
                code,
                redirect_uri: 'https://example.com/redirect',
                client_secret: confidentialSecret,
            },
        });

        expect(tokenResponse.status).toEqual(400);
        const body = await tokenResponse.json() as { error?: string };
        expect(body.error).toEqual(OAuth2ErrorCode.INVALID_REQUEST);
    });

    it('should accept Basic auth credentials with URL-encoded special characters', async () => {
        const specialSecret = 'secret with spaces & + : %';
        const specialClient = await suite.client
            .client
            .create(createFakeClient({
                secret: specialSecret,
                secret_hashed: false,
                secret_encrypted: false,
                is_confidential: true,
            }));

        const scope = await suite.client.scope.getOne(ScopeName.GLOBAL);
        await suite.client.clientScope.create({
            scope_id: scope.id,
            client_id: specialClient.id,
        });

        const state = generateOAuth2CodeVerifier();
        const response = await suite.client
            .authorize
            .confirm({
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: specialClient.id,
                redirect_uri: 'https://example.com/redirect',
                scope: `${ScopeName.GLOBAL}`,
                state,
            });

        const url = new URL(response.url);
        const code = url.searchParams.get('code')!;

        // RFC 6749 §2.3.1 + Appendix B: form-urlencode credentials before
        // base64. encodeURIComponent matches the percent-encoding part;
        // hapic doesn't apply form-encoding from the client side, but a
        // spec-compliant client would send it this way.
        const encodedId = encodeURIComponent(specialClient.id);
        const encodedSecret = encodeURIComponent(specialSecret);
        const basic = Buffer.from(`${encodedId}:${encodedSecret}`).toString('base64');

        const tokenResponse = await httpRequest(suite, 'POST', '/token', {
            headers: { Authorization: `Basic ${basic}` },
            form: {
                grant_type: 'authorization_code',
                code,
                redirect_uri: 'https://example.com/redirect',
            },
        });

        expect(tokenResponse.status).toEqual(200);
        const body = await tokenResponse.json() as { access_token?: string };
        expect(body.access_token).toBeDefined();
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
        const tokenResponse = await httpRequest(suite, 'POST', '/token', {
            headers: { Authorization: `Basic ${basic}` },
            form: {
                grant_type: 'authorization_code',
                code,
                redirect_uri: 'https://example.com/redirect',
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
            },
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

    it('should scope a name-identified client on token exchange to the realm hint', async () => {
        const realm = await suite.client.realm.create(createFakeRealm());
        const secret = generateOAuth2CodeVerifier();
        const client = await suite.client
            .client
            .create(createFakeClient({
                realm_id: realm.id,
                secret,
                secret_hashed: false,
                secret_encrypted: false,
                is_confidential: true,
            }));
        const scope = await suite.client.scope.getOne(ScopeName.GLOBAL);
        await suite.client.clientScope.create({
            scope_id: scope.id,
            client_id: client.id,
        });

        const userClient = await loginAsRealmUser(realm);
        const issueCode = async () => {
            const response = await userClient
                .authorize
                .confirm({
                    response_type: OAuth2AuthorizationResponseType.CODE,
                    client_id: client.id,
                    redirect_uri: 'https://example.com/redirect',
                    scope: `${ScopeName.GLOBAL}`,
                    state: generateOAuth2CodeVerifier(),
                });
            return new URL(response.url).searchParams.get('code')!;
        };

        // realm_id hint (UUID) scopes the client-name lookup
        let tokenResponse = await suite.client
            .token
            .createWithAuthorizationCode({
                client_id: client.name,
                client_secret: secret,
                redirect_uri: 'https://example.com/redirect',
                code: await issueCode(),
                realm_id: realm.id,
            });
        expect(tokenResponse.access_token).toBeDefined();

        // realm_id also accepts the realm name
        tokenResponse = await suite.client
            .token
            .createWithAuthorizationCode({
                client_id: client.name,
                client_secret: secret,
                redirect_uri: 'https://example.com/redirect',
                code: await issueCode(),
                realm_id: realm.name,
            });
        expect(tokenResponse.access_token).toBeDefined();

        // without a hint the name resolves in master, where the client does
        // not exist — deterministic fail-closed instead of an unscoped match
        const code = await issueCode();
        await expectClientError(
            () => suite.client.token.createWithAuthorizationCode({
                client_id: client.name,
                client_secret: secret,
                redirect_uri: 'https://example.com/redirect',
                code,
            }),
            {
                status: 401,
                code: ErrorCode.OAUTH_CLIENT_INVALID,
                data: { error: OAuth2ErrorCode.INVALID_CLIENT },
            },
        );
    });

    it('should reject /authorize when the identity realm differs from the client realm', async () => {
        // scenario 1: an identity logged in to realm A (here the master-realm
        // admin) authorizing against a client in realm B must be rejected with
        // login_required — otherwise a lingering session silently mints a
        // cross-realm code/token (confused deputy).
        const realm = await suite.client.realm.create(createFakeRealm());
        const client = await suite.client
            .client
            .create(createFakeClient({
                realm_id: realm.id,
                is_confidential: false,
                secret: null,
            }));
        const scope = await suite.client.scope.getOne(ScopeName.GLOBAL);
        await suite.client.clientScope.create({
            scope_id: scope.id,
            client_id: client.id,
        });

        const codeVerifier = generateOAuth2CodeVerifier();
        const codeChallenge = await buildOAuth2CodeChallenge(codeVerifier);

        await expectClientError(
            () => suite.client.authorize.confirm({
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: client.id,
                redirect_uri: 'https://example.com/redirect',
                scope: `${ScopeName.GLOBAL}`,
                code_challenge: codeChallenge,
                code_challenge_method: OAuth2AuthorizationCodeChallengeMethod.SHA_256,
                state: generateOAuth2CodeVerifier(),
            }),
            {
                status: 400,
                code: ErrorCode.OAUTH_LOGIN_REQUIRED,
                data: { error: OAuth2ErrorCode.LOGIN_REQUIRED },
            },
        );
    });

    it('should allow /authorize when the identity realm matches the client realm', async () => {
        // control for the realm gate: a client in the actor's own (master) realm
        // authorizes normally.
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
                state: generateOAuth2CodeVerifier(),
            });

        expect(new URL(response.url).searchParams.get('code')).toBeTruthy();
    });

    it('should exchange a code for a name-identified public client scoped to its realm', async () => {
        const realm = await suite.client.realm.create(createFakeRealm());
        const client = await suite.client
            .client
            .create(createFakeClient({
                realm_id: realm.id,
                is_confidential: false,
                secret: null,
            }));
        const scope = await suite.client.scope.getOne(ScopeName.GLOBAL);
        await suite.client.clientScope.create({
            scope_id: scope.id,
            client_id: client.id,
        });

        const codeVerifier = generateOAuth2CodeVerifier();
        const codeChallenge = await buildOAuth2CodeChallenge(codeVerifier);

        const userClient = await loginAsRealmUser(realm);
        const response = await userClient
            .authorize
            .confirm({
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: client.id,
                redirect_uri: 'https://example.com/redirect',
                scope: `${ScopeName.GLOBAL}`,
                code_challenge: codeChallenge,
                code_challenge_method: OAuth2AuthorizationCodeChallengeMethod.SHA_256,
                state: generateOAuth2CodeVerifier(),
            });

        const code = new URL(response.url).searchParams.get('code')!;

        const tokenResponse = await suite.client
            .token
            .createWithAuthorizationCode({
                client_id: client.name,
                redirect_uri: 'https://example.com/redirect',
                code,
                code_verifier: codeVerifier,
                realm_id: realm.id,
            });

        expect(tokenResponse.access_token).toBeDefined();
    });
});
