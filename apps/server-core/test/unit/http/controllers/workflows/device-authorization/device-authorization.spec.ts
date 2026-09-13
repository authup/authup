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
import { ScopeName } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import { buildCacheKey } from '@authup/server-kit';
import { OAuth2ErrorCode, OAuth2TokenGrant } from '@authup/specs';
import { OAUTH2_DEVICE_CODE_GRACE, generateOAuth2CodeVerifier } from '../../../../../../src/core/index.ts';
import type { OAuth2DeviceCodeRequest } from '../../../../../../src/core/index.ts';
import { CacheInjectionKey, ConfigInjectionKey } from '../../../../../../src/app/index.ts';
import { CacheOAuth2Prefix } from '../../../../../../src/app/modules/oauth2/repositories/constants.ts';
import { createFakeClient, createFakeRealm, httpRequest } from '../../../../../utils/index.ts';
import { createTestApplication } from '../../../../../app/index.ts';

const DEVICE_GRANT_TYPES = `${OAuth2TokenGrant.DEVICE_CODE} refresh_token`;
const USER_CODE_PATTERN = /^[BCDFGHJKLMNPQRSTVWXZ]{4}-[BCDFGHJKLMNPQRSTVWXZ]{4}$/;

describe('src/http/controllers/workflows/device-authorization', () => {
    const suite = createTestApplication();

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
});
