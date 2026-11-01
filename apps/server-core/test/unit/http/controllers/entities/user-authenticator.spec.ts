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
import { Client as HTTPClient } from '@authup/core-http-kit';
import { CLIENT_ACCOUNT_CONSOLE_NAME, UserAuthenticatorKind } from '@authup/core-kit';
import { OAuth2AuthorizationResponseType } from '@authup/specs';
import { ConfigInjectionKey } from '../../../../../src/app';
import { SESSION_COOKIE } from '../../../../../src/core';
import {
    TestCookieJar,
    createFakeUser,
    expectClientError,
    httpRequest,
} from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('src/http/controllers/user-authenticator', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.mfaEnabled = true;
        },
    });

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function createUserBearer(password: string): Promise<{ id: string, client: HTTPClient }> {
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));
        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
        });
        const client = new HTTPClient({ baseURL: suite.baseURL });

        client.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });

        return { id: user.id, client };
    }

    it('lets an admin list and reset another user\'s devices', async () => {
        const { id: userId, client: userClient } = await createUserBearer('admin-managed-pw');

        // secret-bearing factors are self-enrollment only — the user enrolls
        // their own recovery set (the admin never sees the codes).
        const enrolled = await userClient.userAuthenticator.enroll('@me', { kind: UserAuthenticatorKind.RECOVERY });

        expect(enrolled.meta.codes).toHaveLength(10);
        expect(enrolled.data.userId).toEqual(userId);

        // the admin can list it (secrets nulled) ...
        const list = await suite.client.userAuthenticator.getMany(userId);

        expect(list.data).toHaveLength(1);
        expect(list.data[0].codes ?? null).toBeNull();

        // ... and reset it by deleting (the sanctioned admin management path)
        const { data: deleted } = await suite.client.userAuthenticator.delete(userId, enrolled.data.id);

        expect(deleted.id).toEqual(enrolled.data.id);

        const after = await suite.client.userAuthenticator.getMany(userId);

        expect(after.data).toHaveLength(0);
    });

    it('refuses an admin enrolling an owner-controlled factor for another user', async () => {
        const { id: userId } = await createUserBearer('admin-enroll-block-pw');

        // totp/recovery would disclose the seed/codes to the admin, and a
        // webauthn ceremony can be completed on the admin's own authenticator —
        // all three are self-enrollment only.
        for (const kind of [
            UserAuthenticatorKind.TOTP,
            UserAuthenticatorKind.RECOVERY,
            UserAuthenticatorKind.WEBAUTHN,
        ]) {
            await expectClientError(
                () => suite.client.userAuthenticator.enroll(userId, { kind }),
                { status: 400 },
            );
        }

        // nothing was created on the target
        const list = await suite.client.userAuthenticator.getMany(userId);

        expect(list.data).toHaveLength(0);
    });

    it('ends the sessions predating the first factor, except the enrolling one', async () => {
        const password = 'first-factor-pw';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));

        const clients: HTTPClient[] = [];
        const refreshTokens: string[] = [];

        for (let i = 0; i < 2; i++) {
            const login = await suite.client.token.createWithPassword({ username: user.name, password });
            const client = new HTTPClient({ baseURL: suite.baseURL });

            client.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });
            clients.push(client);
            refreshTokens.push(login.refresh_token!);
        }

        const [enrolling, other] = clients;

        await enrolling.userAuthenticator.enroll('@me', { kind: UserAuthenticatorKind.RECOVERY });

        await expectClientError(
            () => other.userAuthenticator.getMany('@me'),
            { status: 401 },
        );
        await expectClientError(
            () => suite.client.token.createWithRefreshToken({ refresh_token: refreshTokens[1] }),
            { status: 400 },
        );

        const list = await enrolling.userAuthenticator.getMany('@me');

        expect(list.data).toHaveLength(1);
    });

    it('keeps the console cookie session a first factor is enrolled from', async () => {
        const password = 'first-factor-cookie-pw';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));
        const { data: realm } = await suite.client.realm.getOne('master');
        const publicOrigin = new URL(suite.container.resolve(ConfigInjectionKey).publicUrl).origin;

        const jar = new TestCookieJar();
        const request = (method: string, path: string, options: Record<string, any> = {}) => {
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
        };

        const kick = await request('GET', `/console/account/login/start?realmId=${realm.id}`, { redirect: 'manual' });
        const authorizeURL = new URL(kick.headers.get('location') as string);

        const login = await suite.client.token.createWithPassword({ username: user.name, password });
        const loginClient = new HTTPClient({ baseURL: suite.baseURL });

        loginClient.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });

        const authorized = await loginClient.authorize.confirm({
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: CLIENT_ACCOUNT_CONSOLE_NAME,
            realm_id: realm.id,
            redirect_uri: authorizeURL.searchParams.get('redirect_uri') as string,
            scope: authorizeURL.searchParams.get('scope') as string,
            state: authorizeURL.searchParams.get('state') as string,
            code_challenge: authorizeURL.searchParams.get('code_challenge') as string,
            code_challenge_method: authorizeURL.searchParams.get('code_challenge_method') as string,
        });

        const code = new URL(authorized.url).searchParams.get('code') as string;
        const state = authorizeURL.searchParams.get('state') as string;

        await request('GET', `/console/account/callback?code=${code}&state=${state}`, {
            redirect: 'manual',
            headers: { 'sec-fetch-site': 'same-origin' },
        });

        expect(jar.get(SESSION_COOKIE)).toBeDefined();

        const other = await suite.client.token.createWithPassword({ username: user.name, password });
        const otherClient = new HTTPClient({ baseURL: suite.baseURL });

        otherClient.setAuthorizationHeader({ type: 'Bearer', token: other.access_token });

        await otherClient.userAuthenticator.getMany('@me');

        const enrolled = await request('POST', '/users/@me/authenticators', {
            body: JSON.stringify({ kind: UserAuthenticatorKind.RECOVERY }),
            headers: {
                'content-type': 'application/json',
                'sec-fetch-site': 'same-origin',
                origin: publicOrigin,
            },
        });

        expect(enrolled.status).toEqual(201);
        expect((await enrolled.json()).meta.codes).toHaveLength(10);

        await expectClientError(
            () => otherClient.userAuthenticator.getMany('@me'),
            { status: 401 },
        );

        const introspected = await request('GET', '/sessions/@me/introspect', { headers: { 'sec-fetch-site': 'same-origin' } });

        expect(introspected.status).toEqual(200);

        const body = await introspected.json();

        expect(body.active).toEqual(true);
        expect(body.sub).toEqual(user.id);
    });

    it('denies a non-privileged user access to a foreign user\'s devices', async () => {
        const owner = await createUserBearer('owner-password-1');
        const stranger = await createUserBearer('stranger-password-1');

        const enrolled = await owner.client.userAuthenticator.enroll('@me', { kind: UserAuthenticatorKind.RECOVERY });

        await expectClientError(
            () => stranger.client.userAuthenticator.getMany(owner.id),
            { status: 403 },
        );

        await expectClientError(
            () => stranger.client.userAuthenticator.delete(owner.id, enrolled.data.id),
            { status: 403 },
        );

        // a foreign device id under the OWN nested route is a 404, never
        // an existence oracle
        await expectClientError(
            () => stranger.client.userAuthenticator.getOne('@me', enrolled.data.id),
            { status: 404 },
        );
    });

    it('keeps a non-user identity out of the challenge surface', async () => {
        const status = await suite.client.userAuthenticator.challenge();

        // suite.client authenticates via admin user basic auth — a user
        // without devices is simply not required to present a factor.
        expect(status.required).toBeFalsy();
        expect(status.kinds).toEqual([]);
    });
});
