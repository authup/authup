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
import type { Client } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import type { OAuth2TokenPayload } from '@authup/specs';
import { SessionTokenEntity } from '../../../../../../src/adapters/database/domains/index.ts';
import {
    createFakeClient,
    createFakeRealm,
    createFakeUser,
    expectClientError,
    httpRequest,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

const BROWSER_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';
// what a server-side refresh looks like: undici's default UA
const RENDERER_USER_AGENT = 'node';

function decodeJwtPayload(token: string): OAuth2TokenPayload {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
}

describe('refresh-token', () => {
    const suite = createTestApplication();

    let confidentialClient: Client;
    let confidentialSecret: string;

    beforeAll(async () => {
        await suite.setup();

        confidentialSecret = 'refresh-token-test-secret';
        confidentialClient = (await suite.client
            .client
            .create(createFakeClient({
                secret: confidentialSecret,
                secretHashed: false,
                secretEncrypted: false,
                authMethod: 'secret',
                tokenBindingMethod: 'none',
            }))).data;
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should grant token with refresh token issued by password grant (no client)', async () => {
        let response = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        expect(response.access_token).toBeDefined();

        response = await suite.client
            .token
            .createWithRefreshToken({ refresh_token: response.refresh_token! });

        expect(response).toBeDefined();
        expect(response.access_token).toBeDefined();
        expect(response.expires_in).toBeDefined();
        expect(response.refresh_token).toBeDefined();
    });

    it('should grant refresh when authenticated client matches token client_id', async () => {
        const initial = await suite.client
            .token
            .createWithClientCredentials({
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
            });

        // client_credentials grant doesn't issue a refresh_token; use the
        // password grant with explicit client auth instead to obtain a
        // refresh_token bound to the confidential client.
        const passwordResponse = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
            });

        expect(initial.access_token).toBeDefined();
        expect(passwordResponse.refresh_token).toBeDefined();

        const refreshed = await suite.client
            .token
            .createWithRefreshToken({
                refresh_token: passwordResponse.refresh_token!,
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
            });

        expect(refreshed.access_token).toBeDefined();
    });

    it('should reject refresh when a CONFIDENTIAL bound token omits client auth', async () => {
        const passwordResponse = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
            });

        // A confidential client MUST re-authenticate on refresh (RFC 6749 §6):
        // the server resolves the bound client and, finding it confidential
        // with no secret presented, rejects invalid_client.
        await expectClientError(
            () => suite.client.token.createWithRefreshToken({ refresh_token: passwordResponse.refresh_token! }),
            { status: 401, code: ErrorCode.OAUTH_CLIENT_INVALID },
        );
    });

    it('should grant refresh for a PUBLIC bound token without client auth', async () => {
        // A public client cannot authenticate (no secret) and RFC 6749 §10.4
        // does not require it to — the server extracts the bound client_id from
        // the signed token. This is what lets the public client-admin-console `web`
        // client auto-refresh with just { refresh_token }.
        const { data: publicClient } = await suite.client
            .client
            .create(createFakeClient({
                authMethod: 'none',
                tokenBindingMethod: 'none',
                secret: null,
            }));

        const login = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
                client_id: publicClient.id,
            });

        expect(login.refresh_token).toBeDefined();

        // Guard the test's own premise: the token MUST be client-bound, so the
        // refresh below genuinely exercises the extraction path and cannot
        // silently pass through the legacy no-client flow.
        const introspected = await suite.client
            .token
            .introspect({ token: login.refresh_token! }, { authorizationHeaderInherit: true });
        expect(introspected.client_id).toEqual(publicClient.id);

        const refreshed = await suite.client
            .token
            .createWithRefreshToken({ refresh_token: login.refresh_token! });

        expect(refreshed.access_token).toBeDefined();
        expect(refreshed.refresh_token).toBeDefined();
    });

    it('should reject refresh when authenticated client_id does not match token client_id', async () => {
        const otherSecret = 'other-refresh-secret';
        const { data: otherClient } = await suite.client
            .client
            .create(createFakeClient({
                secret: otherSecret,
                secretHashed: false,
                secretEncrypted: false,
                authMethod: 'secret',
                tokenBindingMethod: 'none',
            }));

        const passwordResponse = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
            });

        await expectClientError(
            () => suite.client.token.createWithRefreshToken({
                refresh_token: passwordResponse.refresh_token!,
                client_id: otherClient.id,
                client_secret: otherSecret,
            }),
            { status: 400, code: ErrorCode.OAUTH_GRANT_INVALID },
        );
    });

    it('should reject refresh when client provides wrong secret', async () => {
        const passwordResponse = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
            });

        await expectClientError(
            () => suite.client.token.createWithRefreshToken({
                refresh_token: passwordResponse.refresh_token!,
                client_id: confidentialClient.id,
                client_secret: 'wrong-secret',
            }),
            { status: 401, code: ErrorCode.OAUTH_CLIENT_INVALID },
        );
    });

    it('should resolve a name-identified client deterministically across password and refresh legs', async () => {
        // same-named confidential clients in master and another realm — the
        // realm-less name lookup must resolve master on BOTH legs instead of
        // matching an arbitrary realm's client on refresh
        const { data: realm } = await suite.client.realm.create(createFakeRealm());
        const { name } = createFakeClient();
        const masterSecret = 'master-leg-secret';
        await suite.client.client.create(createFakeClient({
            name,
            secret: masterSecret,
            secretHashed: false,
            secretEncrypted: false,
            authMethod: 'secret',
            tokenBindingMethod: 'none',
        }));
        await suite.client.client.create(createFakeClient({
            name,
            realmId: realm.id,
            secret: 'other-realm-secret',
            secretHashed: false,
            secretEncrypted: false,
            authMethod: 'secret',
            tokenBindingMethod: 'none',
        }));

        const passwordResponse = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
                client_id: name,
                client_secret: masterSecret,
            });

        const refreshed = await suite.client
            .token
            .createWithRefreshToken({
                refresh_token: passwordResponse.refresh_token!,
                client_id: name,
                client_secret: masterSecret,
            });

        expect(refreshed.access_token).toBeDefined();
    });

    it('should scope a name-identified client on refresh to the realm hint', async () => {
        const { data: realm } = await suite.client.realm.create(createFakeRealm());
        const secret = 'realm-refresh-secret';
        const { data: client } = await suite.client.client.create(createFakeClient({
            realmId: realm.id,
            secret,
            secretHashed: false,
            secretEncrypted: false,
            authMethod: 'secret',
            tokenBindingMethod: 'none',
        }));
        const { data: user } = await suite.client.user.create(createFakeUser({
            realmId: realm.id,
            password: 'realm-user-secret',
        }));

        const login = () => suite.client
            .token
            .createWithPassword({
                username: user.name,
                password: 'realm-user-secret',
                client_id: client.name,
                client_secret: secret,
                realm_id: realm.id,
            });

        let passwordResponse = await login();
        const refreshed = await suite.client
            .token
            .createWithRefreshToken({
                refresh_token: passwordResponse.refresh_token!,
                client_id: client.name,
                client_secret: secret,
                realm_id: realm.id,
            });

        expect(refreshed.access_token).toBeDefined();

        // realm_name is honored and canonicalized on the refresh leg too
        passwordResponse = await login();
        const rawResponse = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'refresh_token',
                refresh_token: passwordResponse.refresh_token!,
                client_id: client.name,
                client_secret: secret,
                realm_name: ` ${realm.name.toUpperCase()} `,
            },
        });
        expect(rawResponse.status).toEqual(200);

        // without a hint the name resolves in master, where the client does
        // not exist — deterministic fail-closed instead of an unscoped match
        passwordResponse = await login();
        await expectClientError(
            () => suite.client.token.createWithRefreshToken({
                refresh_token: passwordResponse.refresh_token!,
                client_id: client.name,
                client_secret: secret,
            }),
            { status: 401, code: ErrorCode.OAUTH_CLIENT_INVALID },
        );
    });

    it('should ignore the realm hint for a UUID-identified client on refresh', async () => {
        const passwordResponse = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
            });

        const refreshed = await suite.client
            .token
            .createWithRefreshToken({
                refresh_token: passwordResponse.refresh_token!,
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
                realm_id: 'this-realm-does-not-exist',
            });

        expect(refreshed.access_token).toBeDefined();
    });

    it('should reject refresh by a public client whose realm differs from the token realm', async () => {
        // A no-client refresh token (master realm) presented with a PUBLIC client
        // from another realm must be rejected — a public client may only refresh
        // tokens of its own realm. Kills legacy cross-realm public-client refresh
        // tokens minted before the authorize-side realm gate existed.
        const { data: realm } = await suite.client.realm.create(createFakeRealm());
        const { data: publicClient } = await suite.client.client.create(createFakeClient({
            realmId: realm.id,
            authMethod: 'none',
            tokenBindingMethod: 'none',
            secret: null,
        }));

        const login = await suite.client
            .token
            .createWithPassword({ username: 'admin', password: 'start123' });

        await expectClientError(
            () => suite.client.token.createWithRefreshToken({
                refresh_token: login.refresh_token!,
                client_id: publicClient.id,
            }),
            { status: 400, code: ErrorCode.OAUTH_GRANT_INVALID },
        );
    });

    it('should allow refresh by a public client of the token\'s own realm', async () => {
        // control for the parity guard above: same-realm public client refreshes
        // a same-realm token normally.
        const { data: realm } = await suite.client.realm.create(createFakeRealm());
        const { data: publicClient } = await suite.client.client.create(createFakeClient({
            realmId: realm.id,
            authMethod: 'none',
            tokenBindingMethod: 'none',
            secret: null,
        }));
        const { data: user } = await suite.client.user.create(createFakeUser({
            realmId: realm.id,
            password: 'realm-public-refresh',
        }));

        const login = await suite.client
            .token
            .createWithPassword({
                username: user.name,
                password: 'realm-public-refresh',
                realm_id: realm.id,
            });

        const refreshed = await suite.client
            .token
            .createWithRefreshToken({
                refresh_token: login.refresh_token!,
                client_id: publicClient.id,
                realm_id: realm.id,
            });

        expect(refreshed.access_token).toBeDefined();
    });

    it('should allow a confidential client to refresh a token whose realm differs (exemption)', async () => {
        // The refresh realm-parity guard is intentionally public-clients-only: a
        // confidential client's secret proves its identity, so it may refresh a
        // token minted for another realm — the documented cross-realm password
        // grant (a UUID-identified realm user authenticated via a master-realm
        // authenticated client). Dropping the public-client check from the guard
        // would break this leg; this is its control.
        const { data: realm } = await suite.client.realm.create(createFakeRealm());
        const { data: user } = await suite.client.user.create(createFakeUser({
            realmId: realm.id,
            password: 'confidential-cross-realm',
        }));

        // UUID username resolves globally; the master-realm confidential client
        // authenticates. The issued token carries the user's (realm A) realm_id,
        // which differs from the confidential client's (master) realm.
        const login = await suite.client
            .token
            .createWithPassword({
                username: user.id,
                password: 'confidential-cross-realm',
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
            });

        expect(login.refresh_token).toBeDefined();

        const refreshed = await suite.client
            .token
            .createWithRefreshToken({
                refresh_token: login.refresh_token!,
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
            });

        expect(refreshed.access_token).toBeDefined();
    });

    it('should detect refresh-token replay and revoke the whole session family', async () => {
        const login = await suite.client
            .token
            .createWithPassword({ username: 'admin', password: 'start123' });

        const rt1 = login.refresh_token!;

        const rotated = await suite.client
            .token
            .createWithRefreshToken({ refresh_token: rt1 });

        expect(rotated.refresh_token).toBeDefined();
        const rt2 = rotated.refresh_token!;
        const at2 = rotated.access_token;

        // replay the already-consumed refresh token
        await expectClientError(
            () => suite.client.token.createWithRefreshToken({ refresh_token: rt1 }),
            { status: 400, code: ErrorCode.OAUTH_GRANT_INVALID },
        );

        // family revoke: the rotated-in refresh token is now dead too
        await expectClientError(
            () => suite.client.token.createWithRefreshToken({ refresh_token: rt2 }),
            { status: 400, code: ErrorCode.OAUTH_GRANT_INVALID },
        );

        // and the access token minted alongside it introspects as inactive
        const introspect = await suite.client
            .token
            .introspect({ token: at2 }, { authorizationHeaderInherit: true });
        expect(introspect.active).toBeFalsy();
    });

    // End-to-end shape of the device split: the session names the device it
    // belongs to (pinned at creation), the inventory names where each token was
    // issued from. Without the split, a refresh arriving from anywhere else —
    // the subject's laptop on a new network, or a server-side renderer holding
    // the auth cookies — rewrote the session row and the sessions UI stopped
    // identifying devices at all.
    it('should keep the session device pinned and record the refresh on the token row', async () => {
        const login = await httpRequest(suite, 'POST', '/token', {
            headers: { 'user-agent': BROWSER_USER_AGENT },
            form: {
                grant_type: 'password',
                username: 'admin',
                password: 'start123',
            },
        });
        expect(login.status).toEqual(200);
        const grant = await login.json();

        const sessionId = decodeJwtPayload(grant.access_token).session_id!;
        expect(sessionId).toBeDefined();

        const refreshed = await httpRequest(suite, 'POST', '/token', {
            headers: { 'user-agent': RENDERER_USER_AGENT },
            form: {
                grant_type: 'refresh_token',
                refresh_token: grant.refresh_token,
            },
        });
        expect(refreshed.status).toEqual(200);
        const rotated = await refreshed.json();

        // same session, still attributed to the browser it was created from
        const rotatedPayload = decodeJwtPayload(rotated.access_token);
        expect(rotatedPayload.session_id).toEqual(sessionId);

        const { data: session } = await suite.client.session.getOne(sessionId);
        expect(session.userAgent).toEqual(BROWSER_USER_AGENT);

        // the refresh itself is not lost: it is on the issuance
        const row = await suite.dataSource
            .getRepository(SessionTokenEntity)
            .findOne({ where: { id: rotatedPayload.jti! } });
        expect(row?.userAgent).toEqual(RENDERER_USER_AGENT);
    });

    it('should reject a refresh token that was explicitly revoked', async () => {
        const login = await suite.client
            .token
            .createWithPassword({ username: 'admin', password: 'start123' });

        const rt = login.refresh_token!;

        await suite.client
            .token
            .revoke({ token: rt });

        await expectClientError(
            () => suite.client.token.createWithRefreshToken({ refresh_token: rt }),
            { status: 400, code: ErrorCode.OAUTH_GRANT_INVALID },
        );
    });

    // RFC 6749 5.2: the token endpoint answers `invalid_grant` (400) for a
    // refresh token it cannot accept, whatever is wrong with it. The three
    // JWT codes answer 401 on a RESOURCE route (RFC 6750 3.1), so letting a
    // verification failure through unmapped would report a bad grant as if
    // the CLIENT had failed to authenticate, and would answer an
    // unverifiable token differently from a wrong-kind one.
    it.each([
        ['an unparsable token', 'garbage'],
        ['a forged three-segment token', 'aaa.bbb.ccc'],
    ])('should reject %s as an invalid grant', async (_label, refreshToken) => {
        await expectClientError(
            () => suite.client.token.createWithRefreshToken({ refresh_token: refreshToken }),
            { status: 400, code: ErrorCode.OAUTH_GRANT_INVALID },
        );
    });
});

