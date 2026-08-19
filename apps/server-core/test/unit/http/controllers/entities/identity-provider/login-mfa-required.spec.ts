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
import { OAuth2ErrorCode } from '@authup/specs';
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
const encode = (input: Record<string, any>) => Buffer.from(JSON.stringify(input)).toString('base64url');

/**
 * `mfaRequired` says every user must hold a local factor, and the rule
 * governs the local credential. A federated user has none, so its login
 * completes, the page is told to enroll nothing, and the application's code
 * is issued. A password login in the same realm still owes a factor, which
 * is the half that would break first if the suppression reached further
 * than the external session.
 */
describe('identity-provider login (mfaRequired)', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.mfaEnabled = true;
            config.mfaRequired = true;
        },
    });

    let idpServer: Server;
    let realm: Realm;
    let provider: IdentityProvider;
    let client: Client;

    const jar = new TestCookieJar();
    const publicOrigin = () => new URL(suite.container.resolve(ConfigInjectionKey).publicUrl).origin;

    function request(method: string, path: string, options: Record<string, any> = {}) {
        const cookie = jar.header(`/${path.replace(/^\//, '')}`);

        return httpRequest(suite, method, path, {
            ...options,
            headers: { ...(options.headers ?? {}), ...(cookie ? { cookie } : {}) },
        }).then((response) => {
            jar.store(response);
            return response;
        });
    }

    beforeAll(async () => {
        idpServer = createServer((req, res) => {
            if (req.url && req.url.startsWith('/token')) {
                req.on('data', () => { /* drain */ });
                req.on('end', () => {
                    res.setHeader('content-type', 'application/json');
                    res.end(JSON.stringify({
                        access_token: `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
                            sub: 'external-user-mfa-required',
                            email: 'external-mfa-required@example.com',
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
        const idpURL = `http://127.0.0.1:${(idpServer.address() as AddressInfo).port}`;

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

        const { data: scope } = await suite.client.scope.getOne(ScopeName.GLOBAL);
        await suite.client.clientScope.create({ scopeId: scope.id, clientId: client.id });
    });

    afterAll(async () => {
        await suite.teardown();
        await new Promise<void>((resolve, reject) => {
            idpServer.close((err) => (err ? reject(err) : resolve()));
        });
    });

    it('completes the login and issues the code with no enrollment step', async () => {
        const codeRequest = Buffer.from(JSON.stringify({
            response_type: 'code',
            client_id: client.id,
            realm_id: realm.id,
            redirect_uri: REDIRECT_URI,
            scope: ScopeName.GLOBAL,
            state: 'rp-state',
            code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
            code_challenge_method: 'S256',
        })).toString('base64url');

        const out = await request('GET', `identity-providers/${provider.id}/authorize-out?codeRequest=${codeRequest}`, { redirect: 'manual' });
        const state = new URL(out.headers.get('location') as string).searchParams.get('state');

        const back = await request('GET', `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code`, { redirect: 'manual' });
        expect(back.status).toEqual(302);

        // the completion still mints the pair: enrollment happens through the
        // ordinary authenticated API, which needs a real bearer
        const completed = await request('POST', `identity-providers/${provider.id}/login-complete`, { headers: { origin: publicOrigin() } });
        expect(completed.status).toEqual(200);

        const { access_token: accessToken } = await completed.json();

        // the page is told to render no enrollment step, because the server
        // does not enforce one for an externally authenticated session
        const status = await httpRequest(suite, 'GET', 'authenticators/challenge', { headers: { authorization: `Bearer ${accessToken}` } });
        await expect(status.json()).resolves.toMatchObject({
            required: false,
            enrollmentRequired: false,
        });

        // and the same holds when an application asks for a proof: there is
        // no factor to challenge, so the request cannot be satisfied by
        // enrolling one mid-flow either
        const stepUp = await httpRequest(suite, 'GET', 'authenticators/challenge?acrValues=urn%3Aauthup%3Amfa', { headers: { authorization: `Bearer ${accessToken}` } });
        await expect(stepUp.json()).resolves.toMatchObject({
            required: false,
            enrollmentRequired: false,
        });

        // the authorization itself succeeds: `mfaRequired` governs the local
        // credential, and this login has none
        const approve = await httpRequest(suite, 'POST', 'authorize', {
            headers: {
                authorization: `Bearer ${accessToken}`,
                'content-type': 'application/json',
            },
            body: Buffer.from(codeRequest, 'base64url').toString('utf-8'),
        });

        expect(approve.status).toEqual(200);
        const { url } = await approve.json();
        expect(new URL(url).searchParams.get('code')).toBeTruthy();
    });

    it('still forces enrollment on a password login', async () => {
        // the other half of the rule: mfaRequired is unchanged for a local
        // credential, which is what would break first if the suppression
        // reached further than the external session
        const password = 'a-sufficiently-long-password';
        const { data: user } = await suite.client.user.create({
            name: 'local-user',
            password,
            realmId: realm.id,
            email: 'local-user@example.com',
        });
        expect(user.id).toBeTruthy();

        const token = await httpRequest(suite, 'POST', 'token', {
            form: {
                grant_type: 'password',
                username: 'local-user',
                password,
                realm_id: realm.id,
            },
        });
        expect(token.status).toEqual(200);

        const { access_token: accessToken } = await token.json();

        const status = await httpRequest(suite, 'GET', 'authenticators/challenge', { headers: { authorization: `Bearer ${accessToken}` } });
        await expect(status.json()).resolves.toMatchObject({ enrollmentRequired: true });

        const approve = await httpRequest(suite, 'POST', 'authorize', {
            headers: {
                authorization: `Bearer ${accessToken}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                response_type: 'code',
                client_id: client.id,
                realm_id: realm.id,
                redirect_uri: REDIRECT_URI,
                scope: ScopeName.GLOBAL,
                state: 'rp-state',
                code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
                code_challenge_method: 'S256',
            }),
        });

        expect(approve.status).toEqual(400);
        await expect(approve.json()).resolves.toMatchObject({ error: OAuth2ErrorCode.MFA_REQUIRED });
    });
});
