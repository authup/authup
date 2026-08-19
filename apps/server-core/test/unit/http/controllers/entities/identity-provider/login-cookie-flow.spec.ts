/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
    afterAll, 
    beforeAll, 
    describe, 
    expect, 
    it,
} from 'vitest';
import type { Client, IdentityProvider, Realm } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import {
    TestCookieJar,
    createFakeClient,
    createFakeOAuth2IdentityProvider,
    createFakeRealm,
    httpRequest,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';
import { ConfigInjectionKey } from '../../../../../../src/app/modules/config/constants';

const REDIRECT_URI = 'https://example.com/login/callback';
const CODE_VERIFIER = 'aVeryLongCodeVerifierValueUsedByThePublicClient1234567890';

const encode = (input: Record<string, any>) => Buffer.from(JSON.stringify(input)).toString('base64url');

/**
 * The whole federated handoff driven through a cookie jar that honours
 * `Path`, with no header carried by hand anywhere.
 *
 * Every other spec in this directory echoes `set-cookie` back itself, which
 * proves the server SENT a cookie but not that a browser would send it BACK.
 * A wrongly scoped cookie passes those and breaks every real login. This one
 * fails instead.
 */
describe('identity-provider login (cookie transport)', () => {
    const suite = createTestApplication();

    let idpServer: Server;
    let idpURL: string;

    let realm: Realm;
    let provider: IdentityProvider;
    let client: Client;
    let codeChallenge: string;

    const jar = new TestCookieJar();

    /**
     * The origin a browser would be on: the page it runs is served from
     * publicUrl. In this harness that is not `suite.baseURL`, since the port
     * is bound after the config is normalized.
     */
    const publicOrigin = () => new URL(suite.container.resolve(ConfigInjectionKey).publicUrl).origin;

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

    beforeAll(async () => {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(CODE_VERIFIER));
        codeChallenge = Buffer.from(new Uint8Array(digest)).toString('base64url');

        idpServer = createServer((req, res) => {
            if (req.url && req.url.startsWith('/token')) {
                req.on('data', () => { /* drain */ });
                req.on('end', () => {
                    res.setHeader('content-type', 'application/json');
                    res.end(JSON.stringify({
                        access_token: `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
                            sub: 'external-user-cookie-flow',
                            email: 'external-cookie-flow@example.com',
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

        realm = (await suite.client.realm.create(createFakeRealm())).data;
        provider = (await suite.client.identityProvider.create(createFakeOAuth2IdentityProvider({
            realmId: realm.id,
            tokenUrl: `${idpURL}/token`,
            authorizeUrl: `${idpURL}/authorize`,
        }))).data;

        client = (await suite.client.client.create(createFakeClient({
            realmId: realm.id,
            authMethod: 'none',
            redirectUri: 'https://example.com/**',
        }))).data;

        for (const scopeName of [ScopeName.GLOBAL, ScopeName.OPEN_ID]) {
            const { data: scope } = await suite.client.scope.getOne(scopeName);
            await suite.client.clientScope.create({ scopeId: scope.id, clientId: client.id });
        }
    });

    afterAll(async () => {
        await suite.teardown();
        await new Promise<void>((resolve, reject) => {
            idpServer.close((err) => (err ? reject(err) : resolve()));
        });
    });

    it('carries the whole flow on cookies the browser would actually send', async () => {
        const codeRequest = Buffer.from(JSON.stringify({
            response_type: 'code',
            client_id: client.id,
            realm_id: realm.id,
            redirect_uri: REDIRECT_URI,
            scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
            state: 'rp-state',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
        })).toString('base64url');

        // 1. the start sets the nonce the callback will require
        const out = await request('GET', `identity-providers/${provider.id}/authorize-out?codeRequest=${codeRequest}`, { redirect: 'manual' });
        expect(out.status).toEqual(302);

        const nonce = jar.get('authup_federated_login');
        expect(nonce).toBeTruthy();

        // the jar only yields it for the routes it is scoped to
        expect(jar.header('/identity-providers/x/authorize-in')).toContain('authup_federated_login=');
        expect(jar.header('/authorize')).toBeUndefined();
        expect(jar.header('/users')).toBeUndefined();

        // 2. the callback swaps it for the pending login
        const state = new URL(out.headers.get('location') as string).searchParams.get('state');
        const back = await request('GET', `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code`, { redirect: 'manual' });
        expect(back.status).toEqual(302);

        const pendingLoginId = jar.get('authup_federated_login');
        expect(pendingLoginId).toBeTruthy();
        expect(pendingLoginId).not.toEqual(nonce);

        const hosted = new URL(back.headers.get('location') as string);
        expect(hosted.pathname.endsWith('/authorize')).toBe(true);
        expect(hosted.search).not.toContain(pendingLoginId as string);

        // 3. the page completes it with no payload at all
        const completed = await request('POST', `identity-providers/${provider.id}/login-complete`, { headers: { origin: publicOrigin() } });
        expect(completed.status).toEqual(200);

        const grant = await completed.json();
        expect(grant.access_token).toBeTruthy();

        // the cookie is spent, so a reload completes nothing
        expect(jar.get('authup_federated_login')).toBeUndefined();

        const replay = await request('POST', `identity-providers/${provider.id}/login-complete`, { headers: { origin: publicOrigin() } });
        expect(replay.status).toEqual(400);

        // 4. the ladder issues the application's code, as for any login
        const approve = await request('POST', 'authorize', {
            headers: {
                authorization: `Bearer ${grant.access_token}`,
                'content-type': 'application/json',
            },
            body: Buffer.from(codeRequest, 'base64url').toString('utf-8'),
        });
        expect(approve.status).toEqual(200);

        const { url } = await approve.json();
        const target = new URL(url);
        expect(`${target.origin}${target.pathname}`).toEqual(REDIRECT_URI);
        expect(target.searchParams.get('code')).toBeTruthy();
    });
});
