/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type { Client, IdentityProvider, Realm } from '@authup/core-kit';
import { IdentityProviderProtocol, ScopeName } from '@authup/core-kit';
import { OAuth2ErrorCode, OAuth2TokenGrant } from '@authup/specs';
import {
    TestCookieJar,
    createFakeClient,
    createFakeOAuth2IdentityProvider,
    createFakeRealm,
    httpRequest,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';
import { CacheInjectionKey, ConfigInjectionKey, OAuth2InjectionToken } from '../../../../../../src/app';
import { CacheOAuth2Prefix } from '../../../../../../src/app/modules/oauth2/repositories/constants';

const FEDERATED_LOGIN_COOKIE = 'authup_federated_login';
// well formed, and never minted by anything in this file
const UNKNOWN_USER_CODE = 'BCDFGHJK';
const UNKNOWN_USER_CODE_FORMATTED = 'BCDF-GHJK';
const DEVICE_CACHE_PREFIXES : string[] = [
    CacheOAuth2Prefix.DEVICE_CODE,
    CacheOAuth2Prefix.DEVICE_USER_CODE,
    CacheOAuth2Prefix.DEVICE_DECISION,
    CacheOAuth2Prefix.DEVICE_POLL,
    CacheOAuth2Prefix.DEVICE_LOOKUP_ATTEMPT,
];

const encode = (input: Record<string, any>) => Buffer.from(JSON.stringify(input)).toString('base64url');

/**
 * A federated login the device verification page started (#3589): the state
 * carries a user code instead of a code request, the callback establishes
 * the pending session and nothing else, and the browser returns to /device.
 */
describe('identity-provider login (device verification page)', () => {
    const suite = createTestApplication();

    let idpServer: Server;
    let idpURL: string;
    let idpTokenCalls = 0;

    let publicUrl: string;
    let authConsoleUrl: string;

    let realm: Realm;
    let provider: IdentityProvider;

    const jar = new TestCookieJar();

    const publicOrigin = () => new URL(publicUrl).origin;

    function request(method: string, path: string, options: Record<string, any> = {}) {
        const cookie = jar.header(`/${path.replace(/^\//, '')}`);

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

    async function createDeviceClient(data: Partial<Client> = {}) : Promise<Client> {
        const { data: client } = await suite.client.client.create(createFakeClient({
            realmId: realm.id,
            authMethod: 'none',
            tokenBindingMethod: 'none',
            secret: null,
            grantTypes: `${OAuth2TokenGrant.DEVICE_CODE} refresh_token`,
            ...data,
        }));

        for (const scopeName of [ScopeName.GLOBAL, ScopeName.OPEN_ID]) {
            const { data: scope } = await suite.client.scope.getOne(scopeName);
            await suite.client.clientScope.create({ scopeId: scope.id, clientId: client.id });
        }

        return client;
    }

    async function issueDeviceCode(client: Client) : Promise<{ deviceCode: string, userCode: string }> {
        const response = await httpRequest(suite, 'POST', '/device_authorization', { form: { client_id: client.id } });
        const body = await response.json();

        return { deviceCode: body.device_code, userCode: body.user_code };
    }

    /**
     * @returns the state the provider would send the browser back with
     */
    async function startLogin(userCode: string) : Promise<string> {
        const out = await request(
            'GET',
            `identity-providers/${provider.id}/authorize-out?user_code=${encodeURIComponent(userCode)}`,
            { redirect: 'manual' },
        );
        expect(out.status).toEqual(302);

        return new URL(out.headers.get('location') as string).searchParams.get('state') as string;
    }

    function readLocation(response: Response) : URL {
        expect(response.status).toEqual(302);

        return new URL(response.headers.get('location') as string);
    }

    /**
     * The callback answers with `<publicUrl>/device`, which server-core hands
     * over to the auth console service. The page only ever sees what survives
     * that hop, so the query has to arrive verbatim.
     */
    async function expectDeviceHopCarries(location: URL) {
        const hop = await httpRequest(suite, 'GET', `/device${location.search}`, { redirect: 'manual' });

        expect(hop.status).toBeGreaterThanOrEqual(300);
        expect(hop.status).toBeLessThan(400);
        expect(hop.headers.get('location')).toEqual(`${authConsoleUrl}/device${location.search}`);
    }

    beforeAll(async () => {
        idpServer = createServer((req, res) => {
            if (req.url && req.url.startsWith('/token')) {
                idpTokenCalls++;

                req.on('data', () => { /* drain */ });
                req.on('end', () => {
                    res.setHeader('content-type', 'application/json');
                    res.end(JSON.stringify({
                        access_token: `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
                            sub: 'external-user-device-flow',
                            email: 'external-device-flow@example.com',
                        })}.x`,
                        token_type: 'Bearer',
                    }));
                });
                return;
            }

            res.statusCode = 404;
            res.end();
        });
        await new Promise<void>((resolve) => {
            idpServer.listen(0, '127.0.0.1', resolve);
        });
        idpURL = `http://127.0.0.1:${(idpServer.address() as AddressInfo).port}`;

        await suite.setup();

        const config = suite.container.resolve(ConfigInjectionKey);
        publicUrl = config.publicUrl.replace(/\/+$/, '');
        authConsoleUrl = config.authConsole.url.replace(/\/+$/, '');

        realm = (await suite.client.realm.create(createFakeRealm())).data;
        provider = (await suite.client.identityProvider.create(createFakeOAuth2IdentityProvider({
            realmId: realm.id,
            tokenUrl: `${idpURL}/token`,
            authorizeUrl: `${idpURL}/authorize`,
        }))).data;
    });

    afterAll(async () => {
        await suite.teardown();
        await new Promise<void>((resolve, reject) => {
            idpServer.close((err) => (err ? reject(err) : resolve()));
        });
    });

    beforeEach(() => {
        jar.clear();
        idpTokenCalls = 0;
    });

    it('starts a login from a well-formed user code', async () => {
        const out = await request('GET', `identity-providers/${provider.id}/authorize-out?user_code=bcdf-ghjk`, { redirect: 'manual' });

        const location = readLocation(out);
        expect(`${location.origin}${location.pathname}`).toEqual(`${idpURL}/authorize`);
        expect(location.searchParams.get('state')).toBeTruthy();

        expect(jar.get(FEDERATED_LOGIN_COOKIE)).toBeTruthy();
    });

    it('refuses a malformed user code', async () => {
        const out = await request('GET', `identity-providers/${provider.id}/authorize-out?user_code=nope`, { redirect: 'manual' });

        expect(out.status).toEqual(400);
        expect(out.headers.get('location')).toBeNull();
        expect(jar.get(FEDERATED_LOGIN_COOKIE)).toBeUndefined();

        const body = await out.json();
        expect(body.error).toEqual(OAuth2ErrorCode.INVALID_REQUEST);
    });

    it('refuses a login with neither a code request nor a user code', async () => {
        const out = await request('GET', `identity-providers/${provider.id}/authorize-out`, { redirect: 'manual' });

        expect(out.status).toEqual(400);
        expect(out.headers.get('location')).toBeNull();
        expect(jar.get(FEDERATED_LOGIN_COOKIE)).toBeUndefined();
    });

    it('never falls back to the user code when the request names a code request', async () => {
        const out = await request(
            'GET',
            `identity-providers/${provider.id}/authorize-out?codeRequest=not-a-code-request&user_code=${UNKNOWN_USER_CODE}`,
            { redirect: 'manual' },
        );

        expect(out.status).toEqual(400);
        expect(out.headers.get('location')).toBeNull();
        expect(jar.get(FEDERATED_LOGIN_COOKIE)).toBeUndefined();
    });

    /**
     * The route is anonymous, so a lookup here would tell a caller which user
     * codes exist (RFC 8628 section 5.1). The cache is watched rather than
     * the answer alone: two answers can look alike and still come from a read.
     */
    it('answers the same for a code that does not exist, and reads no device code', async () => {
        const client = await createDeviceClient();

        const cache = suite.container.resolve(CacheInjectionKey);
        const spies = [
            vi.spyOn(cache, 'get'),
            vi.spyOn(cache, 'pop'),
            vi.spyOn(cache, 'has'),
            vi.spyOn(cache, 'add'),
            vi.spyOn(cache, 'set'),
            vi.spyOn(cache, 'increment'),
            vi.spyOn(cache, 'drop'),
        ];
        const keysOf = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.map(([key]) => String(key));
        const deviceKeys = () => spies
            .flatMap((spy) => keysOf(spy))
            .filter((key) => DEVICE_CACHE_PREFIXES.some((prefix) => key.includes(prefix)));

        try {
            // minting one is what proves the watch sees the device keys at all
            const { userCode } = await issueDeviceCode(client);
            expect(deviceKeys().length).toBeGreaterThan(0);

            for (const spy of spies) {
                spy.mockClear();
            }

            const describeAnswer = async (code: string) => {
                const out = await httpRequest(
                    suite,
                    'GET',
                    `identity-providers/${provider.id}/authorize-out?user_code=${code}`,
                    { redirect: 'manual' },
                );
                const location = readLocation(out);
                const cookie = out.headers.get('set-cookie') as string;

                expect(location.searchParams.get('state')).toBeTruthy();
                location.searchParams.delete('state');

                return {
                    status: out.status,
                    location: location.href,
                    cookie: cookie.replace(/authup_federated_login=[^;]*/, `${FEDERATED_LOGIN_COOKIE}=<nonce>`),
                };
            };

            const existing = await describeAnswer(userCode);
            const unknown = await describeAnswer(UNKNOWN_USER_CODE_FORMATTED);

            expect(unknown).toEqual(existing);
            expect(existing.cookie).toContain(`${FEDERATED_LOGIN_COOKIE}=<nonce>`);

            // the state itself is a cache entry, so the cache WAS used
            expect(spies.flatMap((spy) => keysOf(spy)).length).toBeGreaterThan(0);
            expect(deviceKeys()).toEqual([]);
        } finally {
            for (const spy of spies) {
                spy.mockRestore();
            }
        }
    });

    it('lands on the device page with the pending login', async () => {
        const state = await startLogin('bcdf-ghjk');
        const nonce = jar.get(FEDERATED_LOGIN_COOKIE);

        const back = await request('GET', `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code`, { redirect: 'manual' });

        const location = readLocation(back);
        expect(`${location.origin}${location.pathname}`).toEqual(`${publicUrl}/device`);
        expect(location.searchParams.keys().toArray()).toEqual(['user_code', 'provider']);
        expect(location.searchParams.get('user_code')).toEqual(UNKNOWN_USER_CODE_FORMATTED);
        expect(location.searchParams.get('provider')).toEqual(provider.id);

        // the nonce was swapped for the pending login, which never rides the URL
        const pendingLoginId = jar.get(FEDERATED_LOGIN_COOKIE);
        expect(pendingLoginId).toBeTruthy();
        expect(pendingLoginId).not.toEqual(nonce);
        expect(location.search).not.toContain(pendingLoginId as string);

        expect(idpTokenCalls).toEqual(1);

        await expectDeviceHopCarries(location);
    });

    it('returns to the device page when the browser does not carry the cookie', async () => {
        const state = await startLogin(UNKNOWN_USER_CODE);

        // another browser: the state, and no cookie
        const back = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code`,
            { redirect: 'manual' },
        );

        const location = readLocation(back);
        expect(location.href).toEqual(`${publicUrl}/device?user_code=${UNKNOWN_USER_CODE_FORMATTED}`);
        expect(back.headers.get('set-cookie')).toBeNull();
        // refused before the provider's single-use code is spent
        expect(idpTokenCalls).toEqual(0);
    });

    it('returns to the device page when the provider answers an error', async () => {
        const state = await startLogin(UNKNOWN_USER_CODE);

        const back = await request(
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}&error=access_denied&error_description=cancelled`,
            { redirect: 'manual' },
        );

        const location = readLocation(back);
        // nothing of the provider's answer is echoed
        expect(location.href).toEqual(`${publicUrl}/device?user_code=${UNKNOWN_USER_CODE_FORMATTED}`);
        expect(idpTokenCalls).toEqual(0);
    });

    /**
     * Whoever controls the provider's redirect shapes the callback's query,
     * so the return target has to come from the popped state alone.
     */
    it('never reads the return target from the callback query', async () => {
        const forged = [
            'user_code=ZZZZZZZZ',
            `redirect_uri=${encodeURIComponent('https://evil.test/')}`,
            `provider=${randomUUID()}`,
            `client_id=${randomUUID()}`,
        ].join('&');

        const issuedState = await startLogin(UNKNOWN_USER_CODE);
        const issued = await request(
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${issuedState}&code=external-code&${forged}`,
            { redirect: 'manual' },
        );

        let location = readLocation(issued);
        expect(`${location.origin}${location.pathname}`).toEqual(`${publicUrl}/device`);
        expect(location.searchParams.entries().toArray()).toEqual([
            ['user_code', UNKNOWN_USER_CODE_FORMATTED],
            ['provider', provider.id],
        ]);

        jar.clear();

        const refusedState = await startLogin(UNKNOWN_USER_CODE);
        const refused = await request(
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${refusedState}&error=access_denied&${forged}`,
            { redirect: 'manual' },
        );

        location = readLocation(refused);
        expect(location.href).toEqual(`${publicUrl}/device?user_code=${UNKNOWN_USER_CODE_FORMATTED}`);

        const strangerState = await startLogin(UNKNOWN_USER_CODE);
        const stranger = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${strangerState}&code=external-code&${forged}`,
            { redirect: 'manual' },
        );

        location = readLocation(stranger);
        expect(location.href).toEqual(`${publicUrl}/device?user_code=${UNKNOWN_USER_CODE_FORMATTED}`);
    });

    /**
     * authorize-out mints a state with one or the other. Should one ever
     * carry both, the code request decides: its client-dependent gates must
     * run, and a device block may not switch them off.
     */
    it('never skips the code request gates for a state that carries a code request', async () => {
        const stateManager = suite.container.resolve(OAuth2InjectionToken.AuthorizationStateManager);
        const browserNonce = 'nonce-for-a-state-carrying-both';
        const clientId = randomUUID();

        const state = await stateManager.save({
            codeRequest: {
                response_type: 'code',
                // no such client, so the re-verification refuses the request
                client_id: clientId,
                realm_id: realm.id,
                redirect_uri: 'https://example.com/login/callback',
                scope: ScopeName.GLOBAL,
                state: 'rp-state',
            },
            device: { userCode: UNKNOWN_USER_CODE },
            browserNonce,
            ip: '',
        });

        const back = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code`,
            {
                headers: { cookie: `${FEDERATED_LOGIN_COOKIE}=${browserNonce}` },
                redirect: 'manual',
            },
        );

        const location = readLocation(back);
        expect(`${location.origin}${location.pathname}`).toEqual(`${publicUrl}/authorize`);
        expect(location.searchParams.get('client_id')).toEqual(clientId);
        expect(location.searchParams.has('user_code')).toBe(false);
        // refused by the re-verification: no session, and the provider's
        // single-use code was never spent
        expect(location.searchParams.has('provider')).toBe(false);
        expect(back.headers.get('set-cookie')).toBeNull();
        expect(idpTokenCalls).toEqual(0);
    });

    it('refuses a state carrying neither a code request nor a user code', async () => {
        const stateManager = suite.container.resolve(OAuth2InjectionToken.AuthorizationStateManager);
        const browserNonce = 'nonce-for-a-state-carrying-neither';
        const state = await stateManager.save({ browserNonce, ip: '' });

        const back = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code&user_code=${UNKNOWN_USER_CODE}`,
            {
                headers: { cookie: `${FEDERATED_LOGIN_COOKIE}=${browserNonce}` },
                redirect: 'manual',
            },
        );

        expect(back.status).toEqual(400);
        expect(back.headers.get('location')).toBeNull();
        expect(idpTokenCalls).toEqual(0);
    });

    it('approves a device with the federated session', async () => {
        const client = await createDeviceClient();
        const { deviceCode, userCode } = await issueDeviceCode(client);

        const state = await startLogin(userCode);
        const back = await request('GET', `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code`, { redirect: 'manual' });

        const location = readLocation(back);
        expect(location.searchParams.get('user_code')).toEqual(userCode);
        expect(location.searchParams.get('provider')).toEqual(provider.id);

        const completed = await request('POST', `identity-providers/${provider.id}/login-complete`, { headers: { 'sec-fetch-site': 'same-origin', origin: publicOrigin() } });
        expect(completed.status).toEqual(200);

        const grant = await completed.json();
        expect(grant.access_token).toBeTruthy();

        const decide = (path: 'lookup' | 'approve') => httpRequest(suite, 'POST', `/device_authorization/${path}`, {
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${grant.access_token}`,
            },
            body: JSON.stringify({ user_code: userCode }),
        });

        const lookup = await decide('lookup');
        expect(lookup.status).toEqual(200);
        expect((await lookup.json()).client.id).toEqual(client.id);

        const approved = await decide('approve');
        expect(approved.status).toEqual(200);
        expect(await approved.json()).toEqual({ status: 'approved' });

        const redeemed = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: OAuth2TokenGrant.DEVICE_CODE,
                device_code: deviceCode,
                client_id: client.id,
            },
        });
        expect(redeemed.status).toEqual(200);

        const tokens = await redeemed.json();
        expect(tokens.access_token).toBeTruthy();
        expect(tokens.refresh_token).toBeTruthy();
    });

    it('returns to the device page once the provider was disabled', async () => {
        const payload = createFakeOAuth2IdentityProvider({
            realmId: realm.id,
            tokenUrl: `${idpURL}/token`,
            authorizeUrl: `${idpURL}/authorize`,
        });
        const disabled = (await suite.client.identityProvider.create(payload)).data;

        const out = await request('GET', `identity-providers/${disabled.id}/authorize-out?user_code=${UNKNOWN_USER_CODE}`, { redirect: 'manual' });
        const state = readLocation(out).searchParams.get('state');

        // The update carries the whole payload: protocol and the OAuth2
        // attributes are required in every validator group.
        await suite.client.identityProvider.update(disabled.id, {
            ...payload,
            protocol: IdentityProviderProtocol.OAUTH2,
            enabled: false,
        });

        const refusedStart = await httpRequest(suite, 'GET', `identity-providers/${disabled.id}/authorize-out?user_code=${UNKNOWN_USER_CODE}`, { redirect: 'manual' });
        expect(refusedStart.status).toEqual(400);

        const back = await request('GET', `identity-providers/${disabled.id}/authorize-in?state=${state}&code=external-code`, { redirect: 'manual' });

        const location = readLocation(back);
        expect(location.searchParams.entries().toArray()).toEqual([
            ['user_code', UNKNOWN_USER_CODE_FORMATTED],
            ['error', OAuth2ErrorCode.LOGIN_REQUIRED],
        ]);
        expect(idpTokenCalls).toEqual(0);
    });

    it('marks an inactive user\'s refusal', async () => {
        // a first, successful login provisions the external user
        const firstState = await startLogin(UNKNOWN_USER_CODE);
        const first = await request('GET', `identity-providers/${provider.id}/authorize-in?state=${firstState}&code=external-code`, { redirect: 'manual' });
        expect(readLocation(first).searchParams.get('provider')).toEqual(provider.id);

        const { data: accounts } = await suite.client.identityProviderAccount.getMany({ filters: { providerId: provider.id } });
        expect(accounts).toHaveLength(1);
        const [{ userId }] = accounts;

        jar.clear();

        await suite.client.user.update(userId, { active: false });

        // The subject is shared with every other login in this file, so the
        // reactivation belongs in `finally`.
        try {
            const state = await startLogin(UNKNOWN_USER_CODE);
            const back = await request('GET', `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code`, { redirect: 'manual' });

            const location = readLocation(back);
            expect(`${location.origin}${location.pathname}`).toEqual(`${publicUrl}/device`);
            expect(location.searchParams.entries().toArray()).toEqual([
                ['user_code', UNKNOWN_USER_CODE_FORMATTED],
                ['error', OAuth2ErrorCode.ACCESS_DENIED],
            ]);

            // no pending login: the cookie still holds the nonce this login
            // started with, which completes nothing
            const completed = await request('POST', `identity-providers/${provider.id}/login-complete`, { headers: { 'sec-fetch-site': 'same-origin', origin: publicOrigin() } });
            expect(completed.status).toEqual(400);

            await expectDeviceHopCarries(location);
        } finally {
            await suite.client.user.update(userId, { active: true });
        }
    });
});
