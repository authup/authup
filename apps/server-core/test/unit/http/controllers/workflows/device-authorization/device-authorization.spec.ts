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
import { BuiltInPolicyType } from '@authup/access';
import { Client as HTTPClient } from '@authup/core-http-kit';
import type { Client, User } from '@authup/core-kit';
import {
    CLIENT_ACCOUNT_CONSOLE_NAME,
    EventName,
    IdentityType,
    ScopeName,
    UserAuthenticatorKind,
} from '@authup/core-kit';
import { ErrorCode, isDeviceVerificationThrottledError } from '@authup/errors';
import { buildCacheKey } from '@authup/server-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2AuthorizationResponseType, OAuth2ErrorCode, OAuth2TokenGrant } from '@authup/specs';
import { Secret, TOTP } from 'otpauth';
import { OAUTH2_DEVICE_CODE_GRACE, SESSION_COOKIE, generateOAuth2CodeVerifier } from '../../../../../../src/core/index.ts';
import type { OAuth2DeviceCodeRequest } from '../../../../../../src/core/index.ts';
import { CacheInjectionKey, ConfigInjectionKey } from '../../../../../../src/app/index.ts';
import { CacheOAuth2Prefix } from '../../../../../../src/app/modules/oauth2/repositories/constants.ts';
import {
    TestCookieJar,
    createFakeClient,
    createFakeRealm,
    createFakeUser,
    httpRequest,
} from '../../../../../utils/index.ts';
import { createTestApplication } from '../../../../../app/index.ts';

const DEVICE_GRANT_TYPES = `${OAuth2TokenGrant.DEVICE_CODE} refresh_token`;
const USER_CODE_PATTERN = /^[BCDFGHJKLMNPQRSTVWXZ]{4}-[BCDFGHJKLMNPQRSTVWXZ]{4}$/;
const USER_CODE_INVALID_MESSAGE = 'The code is invalid or has expired.';
const WRONG_USER_CODE = 'BCDF-GHJK';

type UserBearer = {
    user: User,
    bearer: HTTPClient,
    accessToken: string,
    password: string,
};

function decodeJwtPayload(token: string): OAuth2TokenPayload {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
}

describe('src/http/controllers/workflows/device-authorization', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.mfaEnabled = true;
        },
    });

    let publicUrl : string;
    let authConsoleUrl : string;

    beforeAll(async () => {
        await suite.setup();

        const config = suite.container.resolve(ConfigInjectionKey);
        publicUrl = config.publicUrl.replace(/\/+$/, '');
        authConsoleUrl = config.authConsole.url.replace(/\/+$/, '');
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function bindScopes(client: Client, names: ScopeName[]) {
        for (const name of names) {
            const { data: scope } = await suite.client.scope.getOne(name);
            await suite.client.clientScope.create({ scopeId: scope.id, clientId: client.id });
        }
    }

    async function createPublicClient(
        data: Partial<Client> = {},
        scopes: ScopeName[] = [ScopeName.GLOBAL, ScopeName.OPEN_ID],
    ) : Promise<Client> {
        const { data: client } = await suite.client.client.create(createFakeClient({
            authMethod: 'none',
            tokenBindingMethod: 'none',
            secret: null,
            grantTypes: DEVICE_GRANT_TYPES,
            ...data,
        }));
        await bindScopes(client, scopes);

        return client;
    }

    async function createConfidentialClient(data: Partial<Client> = {}) : Promise<{ client: Client, secret: string }> {
        const secret = generateOAuth2CodeVerifier();
        const { data: client } = await suite.client.client.create(createFakeClient({
            secret,
            secretHashed: false,
            secretEncrypted: false,
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            grantTypes: DEVICE_GRANT_TYPES,
            ...data,
        }));
        await bindScopes(client, [ScopeName.GLOBAL, ScopeName.OPEN_ID]);

        return { client, secret };
    }

    function request(form: Record<string, string>, headers: Record<string, string> = {}) : Promise<Response> {
        return httpRequest(suite, 'POST', '/device_authorization', { form, headers });
    }

    function poll(deviceCode: string, form: Record<string, string>) : Promise<Response> {
        return httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: OAuth2TokenGrant.DEVICE_CODE,
                device_code: deviceCode,
                ...form,
            },
        });
    }

    async function dropPollWindow(deviceCode: string) {
        const cache = suite.container.resolve(CacheInjectionKey);
        await cache.drop(buildCacheKey({ prefix: CacheOAuth2Prefix.DEVICE_POLL, key: deviceCode }));
    }

    function buildDeviceCodeKey(deviceCode: string) : string {
        return buildCacheKey({ prefix: CacheOAuth2Prefix.DEVICE_CODE, key: deviceCode });
    }

    async function expireDeviceCode(deviceCode: string) {
        const cache = suite.container.resolve(CacheInjectionKey);
        const key = buildDeviceCodeKey(deviceCode);
        const entity = await cache.get<OAuth2DeviceCodeRequest>(key);
        if (!entity) {
            throw new Error(`device code ${deviceCode} is not stored`);
        }

        await cache.set(
            key,
            { ...entity, expires_at: Math.floor(Date.now() / 1000) - 1 },
            { ttl: OAUTH2_DEVICE_CODE_GRACE * 1000 },
        );
    }

    function basic(clientId: string, secret: string) : string {
        return `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`;
    }

    async function issue(client: Client) : Promise<{ deviceCode: string, userCode: string }> {
        const body = await (await request({ client_id: client.id })).json();

        return { deviceCode: body.device_code, userCode: body.user_code };
    }

    async function createUserBearer(realmId?: string) : Promise<UserBearer> {
        const password = generateOAuth2CodeVerifier();
        const { data: user } = await suite.client.user.create(createFakeUser({
            password,
            ...(realmId ? { realmId } : {}),
        }));
        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
            ...(realmId ? { realm_id: realmId } : {}),
        });

        const bearer = new HTTPClient({ baseURL: suite.baseURL });
        bearer.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });

        return {
            user,
            bearer,
            accessToken: login.access_token,
            password,
        };
    }

    function verify(
        path: 'lookup' | 'approve' | 'deny',
        token: string | null,
        body: unknown,
        headers: Record<string, string> = {},
    ) : Promise<Response> {
        return httpRequest(suite, 'POST', `/device_authorization/${path}`, {
            headers: {
                'content-type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...headers,
            },
            body: JSON.stringify(body),
        });
    }

    async function expectInvalidGrant(response: Response) : Promise<Record<string, any>> {
        expect(response.status).toEqual(400);
        const body = await response.json();
        expect(body.code).toEqual(ErrorCode.OAUTH_GRANT_INVALID);
        expect(body.error).toEqual(OAuth2ErrorCode.INVALID_GRANT);

        return body;
    }

    it('should issue a device code to a public client', async () => {
        const client = await createPublicClient();

        const response = await request({ client_id: client.id });
        expect(response.status).toEqual(200);
        expect(response.headers.get('cache-control')).toEqual('no-store');

        const body = await response.json();
        expect(body.device_code).toMatch(/^[0-9a-f]{64}$/);
        expect(body.user_code).toMatch(USER_CODE_PATTERN);
        expect(body.verification_uri).toEqual(`${publicUrl}/device`);
        expect(body.verification_uri_complete).toEqual(`${publicUrl}/device?user_code=${body.user_code}`);
        expect(body.expires_in).toEqual(600);
        expect(body.interval).toEqual(5);
        expect(Object.keys(body).sort()).toEqual([
            'device_code',
            'expires_in',
            'interval',
            'user_code',
            'verification_uri',
            'verification_uri_complete',
        ]);
    });

    it('should authenticate a confidential client through Basic and through the body', async () => {
        const { client, secret } = await createConfidentialClient();

        const viaHeader = await request({}, { Authorization: basic(client.id, secret) });
        expect(viaHeader.status).toEqual(200);

        const viaBody = await request({ client_id: client.id, client_secret: secret });
        expect(viaBody.status).toEqual(200);
    });

    it('should refuse mixed client credentials', async () => {
        const { client, secret } = await createConfidentialClient();

        const response = await request(
            { client_id: client.id, client_secret: secret },
            { Authorization: basic(client.id, secret) },
        );
        expect(response.status).toEqual(400);
        const body = await response.json();
        expect(body.code).toEqual(ErrorCode.OAUTH_REQUEST_INVALID);
        expect(body.error).toEqual(OAuth2ErrorCode.INVALID_REQUEST);
    });

    it('should refuse a wrong secret', async () => {
        const { client } = await createConfidentialClient();

        const response = await request({ client_id: client.id, client_secret: 'wrong' });
        expect(response.status).toEqual(401);
        const body = await response.json();
        expect(body.code).toEqual(ErrorCode.OAUTH_CLIENT_INVALID);
        expect(body.error).toEqual(OAuth2ErrorCode.INVALID_CLIENT);
    });

    it('should refuse a secret on a public client', async () => {
        const client = await createPublicClient();

        const response = await request({ client_id: client.id, client_secret: 'anything' });
        expect(response.status).toEqual(401);
        const body = await response.json();
        expect(body.code).toEqual(ErrorCode.OAUTH_CLIENT_INVALID);
    });

    it('should refuse a client that did not opt in', async () => {
        const client = await createPublicClient({ grantTypes: null });

        const response = await request({ client_id: client.id });
        expect(response.status).toEqual(400);
        const body = await response.json();
        expect(body.code).toEqual(ErrorCode.OAUTH_CLIENT_UNAUTHORIZED);
        expect(body.error).toEqual(OAuth2ErrorCode.UNAUTHORIZED_CLIENT);
    });

    it('should refuse a scope the client does not hold', async () => {
        const client = await createPublicClient({}, [ScopeName.OPEN_ID]);

        const response = await request({ client_id: client.id, scope: 'openid email' });
        expect(response.status).toEqual(400);
        const body = await response.json();
        expect(body.code).toEqual(ErrorCode.OAUTH_SCOPE_INSUFFICIENT);
        expect(body.error).toEqual(OAuth2ErrorCode.INSUFFICIENT_SCOPE);
    });

    it('should pass a request carrying the global scope', async () => {
        const client = await createPublicClient({}, [ScopeName.OPEN_ID]);

        const response = await request({ client_id: client.id, scope: ScopeName.GLOBAL });
        expect(response.status).toEqual(200);
    });

    it('should resolve a name-identified client through the realm hint', async () => {
        const { data: realm } = await suite.client.realm.create(createFakeRealm());
        const client = await createPublicClient({ realmId: realm.id });

        const unresolved = await request({ client_id: client.name });
        expect(unresolved.status).toEqual(401);
        const unresolvedBody = await unresolved.json();
        expect(unresolvedBody.code).toEqual(ErrorCode.OAUTH_CLIENT_INVALID);

        const resolved = await request({ client_id: client.name, realm_name: realm.name });
        expect(resolved.status).toEqual(200);
    });

    it('should answer authorization_pending, then slow_down inside the fixed window', async () => {
        const client = await createPublicClient();
        const { device_code: deviceCode } = await (await request({ client_id: client.id })).json();

        const first = await poll(deviceCode, { client_id: client.id });
        expect(first.status).toEqual(400);
        const firstBody = await first.json();
        expect(firstBody.code).toEqual(ErrorCode.OAUTH_AUTHORIZATION_PENDING);
        expect(firstBody.error).toEqual(OAuth2ErrorCode.AUTHORIZATION_PENDING);

        const second = await poll(deviceCode, { client_id: client.id });
        expect(second.status).toEqual(400);
        const secondBody = await second.json();
        expect(secondBody.code).toEqual(ErrorCode.OAUTH_SLOW_DOWN);
        expect(secondBody.error).toEqual(OAuth2ErrorCode.SLOW_DOWN);
        expect(secondBody).not.toHaveProperty('interval');

        await dropPollWindow(deviceCode);

        const third = await poll(deviceCode, { client_id: client.id });
        expect(third.status).toEqual(400);
        const thirdBody = await third.json();
        expect(thirdBody.code).toEqual(ErrorCode.OAUTH_AUTHORIZATION_PENDING);
    });

    it('should refuse a foreign client before the poll window is armed', async () => {
        const owner = await createPublicClient();
        const other = await createPublicClient();
        const { device_code: deviceCode } = await (await request({ client_id: owner.id })).json();

        const foreign = await poll(deviceCode, { client_id: other.id });
        expect(foreign.status).toEqual(400);
        const foreignBody = await foreign.json();
        expect(foreignBody.code).toEqual(ErrorCode.OAUTH_GRANT_INVALID);
        expect(foreignBody.error).toEqual(OAuth2ErrorCode.INVALID_GRANT);

        const own = await poll(deviceCode, { client_id: owner.id });
        expect(own.status).toEqual(400);
        const ownBody = await own.json();
        expect(ownBody.code).toEqual(ErrorCode.OAUTH_AUTHORIZATION_PENDING);
    });

    it('should answer expired_token once and invalid_grant after the blob is gone', async () => {
        const client = await createPublicClient();
        const { device_code: deviceCode } = await (await request({ client_id: client.id })).json();

        await expireDeviceCode(deviceCode);

        const expired = await poll(deviceCode, { client_id: client.id });
        expect(expired.status).toEqual(400);
        const expiredBody = await expired.json();
        expect(expiredBody.code).toEqual(ErrorCode.OAUTH_DEVICE_CODE_EXPIRED);
        expect(expiredBody.error).toEqual(OAuth2ErrorCode.EXPIRED_TOKEN);

        const cache = suite.container.resolve(CacheInjectionKey);
        expect(await cache.get(buildDeviceCodeKey(deviceCode))).toBeNull();

        const gone = await poll(deviceCode, { client_id: client.id });
        expect(gone.status).toEqual(400);
        const goneBody = await gone.json();
        expect(goneBody.code).toEqual(ErrorCode.OAUTH_GRANT_INVALID);
        expect(goneBody.error).toEqual(OAuth2ErrorCode.INVALID_GRANT);
    });

    it('should hand the verification page over to the auth console', async () => {
        const response = await httpRequest(suite, 'GET', '/device?user_code=BCDF-GHJK', { redirect: 'manual' });

        expect(response.status).toBeGreaterThanOrEqual(300);
        expect(response.status).toBeLessThan(400);
        expect(response.headers.get('cache-control')).toEqual('no-store');

        const location = new URL(response.headers.get('location') ?? '');
        expect(location.href).toEqual(`${authConsoleUrl}/device?user_code=BCDF-GHJK`);
    });

    it('should refuse a device grant without a device_code', async () => {
        const client = await createPublicClient();

        const response = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: OAuth2TokenGrant.DEVICE_CODE,
                client_id: client.id,
            },
        });
        expect(response.status).toEqual(400);
        const body = await response.json();
        expect(body.code).toEqual(ErrorCode.OAUTH_REQUEST_INVALID);
        expect(body.error).toEqual(OAuth2ErrorCode.INVALID_REQUEST);
    });

    it('should refuse an anonymous lookup', async () => {
        const client = await createPublicClient();
        const { userCode } = await issue(client);

        const response = await verify('lookup', null, { user_code: userCode });
        expect(response.status).toEqual(401);
    });

    it('should refuse a console session cookie on the approval', async () => {
        const segment = 'console/account';
        const jar = new TestCookieJar();
        const publicOrigin = new URL(publicUrl).origin;

        function cookieRequest(method: string, path: string, options: Record<string, any> = {}) : Promise<Response> {
            const cookie = jar.header(path);

            return httpRequest(suite, method, path, {
                ...options,
                headers: {
                    ...(options.headers ?? {}),
                    ...(cookie ? { cookie } : {}),
                },
            }).then((response) => {
                jar.store(response);

                return response;
            });
        }

        const { data: realm } = await suite.client.realm.getOne('master');
        const { user, bearer } = await createUserBearer();

        const kick = await cookieRequest('GET', `/${segment}/login/start?realmId=${realm.id}`, { redirect: 'manual' });
        expect(kick.status).toEqual(302);
        const authorizeURL = new URL(kick.headers.get('location') as string);
        const state = authorizeURL.searchParams.get('state') as string;

        const authorized = await bearer.authorize.confirm({
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: CLIENT_ACCOUNT_CONSOLE_NAME,
            realm_id: realm.id,
            redirect_uri: authorizeURL.searchParams.get('redirect_uri') as string,
            scope: authorizeURL.searchParams.get('scope') as string,
            state,
            code_challenge: authorizeURL.searchParams.get('code_challenge') as string,
            code_challenge_method: authorizeURL.searchParams.get('code_challenge_method') as string,
        });
        const code = new URL(authorized.url).searchParams.get('code') as string;

        const callback = await cookieRequest('GET', `/${segment}/callback?code=${code}&state=${state}`, {
            redirect: 'manual',
            headers: { 'sec-fetch-site': 'same-origin' },
        });
        expect(callback.status).toEqual(302);
        expect(jar.get(SESSION_COOKIE)).toBeDefined();

        // the control: the cookie authenticates an ordinary API route
        const me = await cookieRequest('GET', '/users/@me', { headers: { 'sec-fetch-site': 'same-origin' } });
        expect(me.status).toEqual(200);
        expect((await me.json()).data.id).toEqual(user.id);

        // but never the device approval, which sits on the issuance surface
        const client = await createPublicClient();
        const { deviceCode, userCode } = await issue(client);

        const approval = await cookieRequest('POST', '/device_authorization/approve', {
            headers: {
                'sec-fetch-site': 'same-origin',
                origin: publicOrigin,
                'content-type': 'application/json',
            },
            body: JSON.stringify({ user_code: userCode }),
        });
        expect(approval.status).toEqual(401);

        const pending = await poll(deviceCode, { client_id: client.id });
        expect(pending.status).toEqual(400);
        expect((await pending.json()).code).toEqual(ErrorCode.OAUTH_AUTHORIZATION_PENDING);
    });

    it('should refuse an approval presented with a token issued to a client', async () => {
        const client = await createPublicClient();
        const { deviceCode, userCode } = await issue(client);

        // ONE user, two of its own tokens: the clientless one the hosted page
        // holds, and one issued to a client, which may not approve (#3608).
        // The second client only has to allow the password grant, so
        // grantTypes is cleared (the device default excludes it).
        const {
            user, 
            accessToken: hosted, 
            password, 
        } = await createUserBearer();
        const other = await createPublicClient({ grantTypes: null }, []);
        const bound = await suite.client.token.createWithPassword({
            username: user.name,
            password,
            client_id: other.id,
        });
        expect(decodeJwtPayload(bound.access_token).client_id).toEqual(other.id);

        const response = await verify('approve', bound.access_token, { user_code: userCode });
        expect(response.status).toEqual(400);

        const body = await response.json();
        expect(body.code).toEqual(ErrorCode.OAUTH_LOGIN_REQUIRED);
        expect(body.error).toEqual(OAuth2ErrorCode.LOGIN_REQUIRED);

        // the decision was never written: the device keeps polling
        const pending = await poll(deviceCode, { client_id: client.id });
        expect(pending.status).toEqual(400);
        expect((await pending.json()).code).toEqual(ErrorCode.OAUTH_AUTHORIZATION_PENDING);

        // the control: the same user's clientless token approves
        expect((await verify('approve', hosted, { user_code: userCode })).status).toEqual(200);
    });

    it('should answer the lookup with the client summary, the realm and the scope', async () => {
        const client = await createPublicClient();
        const { userCode } = await issue(client);
        const { accessToken } = await createUserBearer();
        const { data: realm } = await suite.client.realm.getOne('master');

        const response = await verify('lookup', accessToken, { user_code: userCode });
        expect(response.status).toEqual(200);
        expect(response.headers.get('cache-control')).toEqual('no-store');

        const body = await response.json();
        expect(Object.keys(body).sort()).toEqual(['client', 'realm', 'scope']);
        expect(Object.keys(body.client).sort()).toEqual(['builtIn', 'createdAt', 'displayName', 'id', 'name']);
        expect(body.client.id).toEqual(client.id);
        expect(body.client.name).toEqual(client.name);
        expect(body.realm.id).toEqual(realm.id);
        expect(body.realm.name).toEqual(realm.name);
        expect(body.scope.split(' ').sort()).toEqual([ScopeName.GLOBAL, ScopeName.OPEN_ID]);
    });

    it('should redeem an approved code on the approver session', async () => {
        const client = await createPublicClient();
        const { deviceCode, userCode } = await issue(client);
        const { user, accessToken } = await createUserBearer();

        const loginIntrospect = await suite.client.token.introspect(
            { token: accessToken },
            { authorizationHeaderInherit: true },
        );
        const loginSessionId = loginIntrospect.session_id as string;
        expect(loginSessionId).toBeDefined();

        const pending = await poll(deviceCode, { client_id: client.id });
        expect((await pending.json()).code).toEqual(ErrorCode.OAUTH_AUTHORIZATION_PENDING);

        const approved = await verify('approve', accessToken, { user_code: userCode });
        expect(approved.status).toEqual(200);
        expect(approved.headers.get('cache-control')).toEqual('no-store');
        expect(await approved.json()).toEqual({ status: 'approved' });

        await dropPollWindow(deviceCode);

        const redeemed = await poll(deviceCode, { client_id: client.id });
        expect(redeemed.status).toEqual(200);
        const token = await redeemed.json();
        expect(token.access_token).toBeDefined();
        expect(token.refresh_token).toBeDefined();
        expect(token.id_token).toBeDefined();

        const introspect = await suite.client.token.introspect(
            { token: token.access_token },
            { authorizationHeaderInherit: true },
        );
        expect(introspect.active).toEqual(true);
        expect(introspect.sub).toEqual(user.id);
        expect(introspect.session_id).toEqual(loginSessionId);
        expect(introspect.client_id).toEqual(client.id);

        const sessions = await suite.client.session.getMany({ filters: { sub: user.id } });
        expect(sessions.data.filter((session) => session.sub === user.id)).toHaveLength(1);

        const tokens = await suite.client.sessionToken.getMany({ filters: { sessionId: loginSessionId } });
        const deviceRows = tokens.data.filter((row) => row.clientId === client.id);
        expect(deviceRows.map((row) => row.kind).sort()).toEqual(['access', 'refresh']);

        const idToken = decodeJwtPayload(token.id_token);
        expect(idToken.sid).toEqual(loginSessionId);
        expect(typeof idToken.auth_time).toEqual('number');

        const rotated = await suite.client.token.createWithRefreshToken({
            refresh_token: token.refresh_token,
            client_id: client.id,
        });
        expect(rotated.access_token).toBeDefined();
        expect(rotated.access_token).not.toEqual(token.access_token);
        expect(rotated.refresh_token).not.toEqual(token.refresh_token);

        await expectInvalidGrant(await poll(deviceCode, { client_id: client.id }));
    });

    it('should answer access_denied once for a denied code, then invalid_grant', async () => {
        const client = await createPublicClient();
        const { deviceCode, userCode } = await issue(client);
        const { accessToken } = await createUserBearer();

        const denied = await verify('deny', accessToken, { user_code: userCode });
        expect(denied.status).toEqual(200);
        expect(await denied.json()).toEqual({ status: 'denied' });

        const first = await poll(deviceCode, { client_id: client.id });
        expect(first.status).toEqual(400);
        const firstBody = await first.json();
        expect(firstBody.code).toEqual(ErrorCode.OAUTH_ACCESS_DENIED);
        expect(firstBody.error).toEqual(OAuth2ErrorCode.ACCESS_DENIED);

        await expectInvalidGrant(await poll(deviceCode, { client_id: client.id }));
    });

    it('should refuse a foreign-realm user with login_required and no identity data', async () => {
        const { data: realm } = await suite.client.realm.create(createFakeRealm());
        const client = await createPublicClient({ realmId: realm.id });
        const { userCode } = await issue(client);
        const { user, accessToken } = await createUserBearer();
        const { data: master } = await suite.client.realm.getOne('master');

        for (const path of ['lookup', 'approve', 'deny'] as const) {
            const response = await verify(path, accessToken, { user_code: userCode });
            expect(response.status).toEqual(400);

            const body = await response.json();
            expect(body.code).toEqual(ErrorCode.OAUTH_LOGIN_REQUIRED);
            expect(body.error).toEqual(OAuth2ErrorCode.LOGIN_REQUIRED);

            const serialized = JSON.stringify(body);
            expect(serialized).not.toContain(user.id);
            expect(serialized).not.toContain(user.name);
            expect(serialized).not.toContain(realm.id);
            expect(serialized).not.toContain(master.id);
        }

        // the control: the code is valid for a user of the client's realm
        const { accessToken: realmAccessToken } = await createUserBearer(realm.id);
        const lookup = await verify('lookup', realmAccessToken, { user_code: userCode });
        expect(lookup.status).toEqual(200);
    });

    it('should require the second factor before approving and accept the challenge', async () => {
        const { bearer, accessToken } = await createUserBearer();

        const enrolled = await bearer.userAuthenticator.enroll('@me', { kind: UserAuthenticatorKind.TOTP });
        const totp = new TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: Secret.fromBase32(enrolled.meta.secret as string),
        });
        const confirmed = await bearer.userAuthenticator.confirm('@me', enrolled.data.id, { code: totp.generate({ timestamp: Date.now() - 30_000 }) });
        expect(confirmed.data.confirmed).toBeTruthy();

        const client = await createPublicClient();
        const { deviceCode, userCode } = await issue(client);

        const refused = await verify('approve', accessToken, { user_code: userCode });
        expect(refused.status).toEqual(400);
        const refusedBody = await refused.json();
        expect(refusedBody.code).toEqual(ErrorCode.OAUTH_MFA_REQUIRED);
        expect(refusedBody.error).toEqual(OAuth2ErrorCode.MFA_REQUIRED);

        const pending = await poll(deviceCode, { client_id: client.id });
        expect((await pending.json()).code).toEqual(ErrorCode.OAUTH_AUTHORIZATION_PENDING);

        const verified = await bearer.userAuthenticator.verifyChallenge({
            kind: UserAuthenticatorKind.TOTP,
            response: totp.generate(),
        });
        expect(verified.verified).toBeTruthy();

        const approved = await verify('approve', accessToken, { user_code: userCode });
        expect(approved.status).toEqual(200);
        expect(await approved.json()).toEqual({ status: 'approved' });
    });

    it('should refuse the approval under a denying access policy', async () => {
        const { data: denyPolicy } = await suite.client.policy.createBuiltIn({
            name: 'device-access-deny',
            type: BuiltInPolicyType.IDENTITY,
            invert: false,
            types: [IdentityType.CLIENT],
            realmId: null,
        });
        const client = await createPublicClient({ accessPolicyId: denyPolicy.id });
        const { deviceCode, userCode } = await issue(client);
        const { accessToken } = await createUserBearer();

        const refused = await verify('approve', accessToken, { user_code: userCode });
        expect(refused.status).toEqual(400);
        const body = await refused.json();
        expect(body.code).toEqual(ErrorCode.OAUTH_ACCESS_DENIED);
        expect(body.error).toEqual(OAuth2ErrorCode.ACCESS_DENIED);
        expect(body).not.toHaveProperty('url');

        const pending = await poll(deviceCode, { client_id: client.id });
        expect((await pending.json()).code).toEqual(ErrorCode.OAUTH_AUTHORIZATION_PENDING);
    });

    it('should refuse the redemption when a policy is attached after the approval', async () => {
        const { data: denyPolicy } = await suite.client.policy.createBuiltIn({
            name: 'device-access-deny-late',
            type: BuiltInPolicyType.IDENTITY,
            invert: false,
            types: [IdentityType.CLIENT],
            realmId: null,
        });
        const client = await createPublicClient();
        const { deviceCode, userCode } = await issue(client);
        const { accessToken } = await createUserBearer();

        const loginIntrospect = await suite.client.token.introspect(
            { token: accessToken },
            { authorizationHeaderInherit: true },
        );
        const loginSessionId = loginIntrospect.session_id as string;
        expect(loginSessionId).toBeDefined();

        const approved = await verify('approve', accessToken, { user_code: userCode });
        expect(approved.status).toEqual(200);

        await suite.client.client.update(client.id, { accessPolicyId: denyPolicy.id });

        await expectInvalidGrant(await poll(deviceCode, { client_id: client.id }));

        // the backstop leaves the row the interactive leg leaves (#3575).
        // AUTHORIZE_FAILED by name: the approval above already recorded an
        // AUTHORIZE row for this client.
        const { data: events } = await suite.client.event.getMany({ filters: { name: EventName.AUTHORIZE_FAILED, clientId: client.id } });
        expect(events).toHaveLength(1);
        expect(events[0].data).toEqual({
            reason: 'accessPolicy',
            grantType: OAuth2TokenGrant.DEVICE_CODE,
        });
        expect(events[0].sessionId).toEqual(loginSessionId);
    });

    it('should throttle the actor after ten misses while a valid lookup consumes none', async () => {
        const client = await createPublicClient();
        const { userCode } = await issue(client);
        const { accessToken } = await createUserBearer();

        for (let i = 0; i < 5; i++) {
            const body = await expectInvalidGrant(await verify('lookup', accessToken, { user_code: WRONG_USER_CODE }));
            expect(body.message).toEqual(USER_CODE_INVALID_MESSAGE);
        }

        const valid = await verify('lookup', accessToken, { user_code: userCode });
        expect(valid.status).toEqual(200);

        for (let i = 0; i < 5; i++) {
            await expectInvalidGrant(await verify('lookup', accessToken, { user_code: WRONG_USER_CODE }));
        }

        const throttled = await verify('lookup', accessToken, { user_code: WRONG_USER_CODE });
        expect(throttled.status).toEqual(429);
        const body = await throttled.json();
        expect(body.code).toEqual(ErrorCode.OAUTH_DEVICE_VERIFICATION_THROTTLED);
        expect(body.retryAfter).toBeGreaterThan(0);
        expect(isDeviceVerificationThrottledError(body)).toBe(true);

        // the valid code is refused too while the actor is locked out
        const locked = await verify('approve', accessToken, { user_code: userCode });
        expect(locked.status).toEqual(429);
    });

    it('should answer the neutral invalid_grant for a non-string user_code', async () => {
        const { accessToken } = await createUserBearer();

        const malformed = await expectInvalidGrant(await verify('lookup', accessToken, { user_code: 42 }));
        const wrong = await expectInvalidGrant(await verify('lookup', accessToken, { user_code: WRONG_USER_CODE }));

        expect(malformed.message).toEqual(USER_CODE_INVALID_MESSAGE);
        expect(malformed.message).toEqual(wrong.message);
    });
});
