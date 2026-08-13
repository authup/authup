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
import type { IdentityProvider, Realm, User } from '@authup/core-kit';
import type { Logger } from '@authup/server-kit';
import { createNoopLogger } from '@authup/server-kit';
import { generateOAuth2CodeVerifier } from '../../../../../../src/core';
import { LoggerInjectionKey } from '../../../../../../src/app';
import {
    createFakeOAuth2IdentityProvider,
    createFakeRealm,
    createFakeUser,
    httpRequest,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

const USER_AGENT = 'link-spec-agent';

const encode = (input: Record<string, any>) => Buffer.from(JSON.stringify(input)).toString('base64url');

describe('identity-provider link flow', () => {
    const suite = createTestApplication();

    let idpServer: Server;
    let idpURL: string;
    let externalUserId = 'external-user-1';
    let tokenEndpointError: Record<string, string> | undefined;

    let realm: Realm;
    let provider: IdentityProvider;
    let user: User;
    let userToken: string;

    // The link callback swallows every failure into a redirect, so the log
    // is the only place its reason can surface. Recording it here is the
    // whole point of the assertion below.
    const logLines: string[] = [];

    beforeAll(async () => {
        // A minimal external IdP: the token endpoint answers every code
        // with an unsigned JWT carrying the current external subject.
        // extractTokenPayload only base64-decodes the middle segment, so
        // no signature is required (the dummy third segment keeps the
        // three-part shape).
        idpServer = createServer((req, res) => {
            if (req.url && req.url.startsWith('/token')) {
                if (tokenEndpointError) {
                    res.statusCode = 400;
                    res.setHeader('content-type', 'application/json');
                    res.end(JSON.stringify(tokenEndpointError));
                    return;
                }

                const accessToken = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
                    sub: externalUserId,
                    email: 'linked@example.com',
                })}.x`;
                res.setHeader('content-type', 'application/json');
                res.end(JSON.stringify({ access_token: accessToken, token_type: 'Bearer' }));
                return;
            }

            res.statusCode = 404;
            res.end();
        });
        await new Promise<void>((resolve) => {
            idpServer.listen(0, '127.0.0.1', resolve);
        });
        idpURL = `http://127.0.0.1:${(idpServer.address() as AddressInfo).port}`;

        const logger = createNoopLogger();
        logger.error = ((message: unknown) => {
            logLines.push(typeof message === 'string' ? message : String(message));
            return logger;
        }) as Logger['error'];
        suite.container.register(LoggerInjectionKey, { useValue: logger });

        await suite.setup();

        realm = (await suite.client.realm.create(createFakeRealm())).data;
        provider = (await suite.client.identityProvider.create(createFakeOAuth2IdentityProvider({
            realmId: realm.id,
            tokenUrl: `${idpURL}/token`,
            authorizeUrl: `${idpURL}/authorize`,
        }))).data;

        const password = generateOAuth2CodeVerifier();
        user = (await suite.client.user.create(createFakeUser({
            realmId: realm.id,
            password,
        }))).data;

        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
            realm_id: realm.id,
        });
        userToken = login.access_token;
    });

    afterAll(async () => {
        await suite.teardown();
        await new Promise<void>((resolve, reject) => {
            idpServer.close((err) => (err ? reject(err) : resolve()));
        });
    });

    async function requestLink(token: string): Promise<{ url: URL, state: string }> {
        const response = await httpRequest(suite, 'POST', `identity-providers/${provider.id}/link-request`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'user-agent': USER_AGENT,
            },
        });
        expect(response.status).toEqual(200);

        const body = await response.json();
        const url = new URL(body.url);
        const state = url.searchParams.get('state');
        expect(state).toBeTruthy();

        return { url, state: state as string };
    }

    async function completeCallback(state: string): Promise<URL> {
        const response = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}&code=any-code`,
            {
                headers: { 'user-agent': USER_AGENT },
                redirect: 'manual',
            },
        );
        expect(response.status).toEqual(302);

        const location = response.headers.get('location');
        expect(location).toBeTruthy();

        return new URL(location as string);
    }

    it('links the external identity to the requesting user', async () => {
        const { url, state } = await requestLink(userToken);

        // the redirect targets the external provider with the callback as
        // redirect_uri
        expect(url.origin).toEqual(idpURL);
        expect(url.searchParams.get('redirect_uri')).toContain(`identity-providers/${provider.id}/authorize-in`);

        const target = await completeCallback(state);
        expect(target.pathname).toContain('account/connected-accounts');
        expect(target.searchParams.get('linked')).toEqual(provider.id);
        expect(target.searchParams.get('linkError')).toBeNull();

        const rows = await suite.client.get(`identity-provider-accounts?filter[userId]=${user.id}`);
        expect(rows.data.data).toHaveLength(1);
        expect(rows.data.data[0].providerUserId).toEqual(externalUserId);
        expect(rows.data.data[0].providerId).toEqual(provider.id);
        expect(rows.data.data[0]).not.toHaveProperty('accessToken');
    });

    it('is idempotent for the same user', async () => {
        const { state } = await requestLink(userToken);
        const target = await completeCallback(state);

        expect(target.searchParams.get('linked')).toEqual(provider.id);

        const rows = await suite.client.get(`identity-provider-accounts?filter[userId]=${user.id}`);
        expect(rows.data.data).toHaveLength(1);
    });

    it('rejects an external identity already linked to another user', async () => {
        const password = generateOAuth2CodeVerifier();
        const { data: secondUser } = await suite.client.user.create(createFakeUser({
            realmId: realm.id,
            password,
        }));
        const login = await suite.client.token.createWithPassword({
            username: secondUser.name,
            password,
            realm_id: realm.id,
        });

        const { state } = await requestLink(login.access_token);
        const target = await completeCallback(state);

        expect(target.searchParams.get('linked')).toBeNull();
        expect(target.searchParams.get('linkError')).toEqual('already_linked');

        // still linked to the FIRST user only
        const rows = await suite.client.get(`identity-provider-accounts?filter[providerId]=${provider.id}`);
        expect(rows.data.data).toHaveLength(1);
        expect(rows.data.data[0].userId).toEqual(user.id);
    });

    it('rejects a replayed state', async () => {
        const { state } = await requestLink(userToken);
        await completeCallback(state);

        const response = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}&code=any-code`,
            {
                headers: { 'user-agent': USER_AGENT },
                redirect: 'manual',
            },
        );
        // one-time state: the second use fails outside the link path
        expect(response.status).not.toEqual(302);
    });

    it('rejects a link-request without a bearer', async () => {
        const response = await httpRequest(suite, 'POST', `identity-providers/${provider.id}/link-request`, { headers: { 'user-agent': USER_AGENT } });
        expect(response.status).toEqual(401);
    });

    it('rejects a link-request for a provider of another realm', async () => {
        const otherRealm = (await suite.client.realm.create(createFakeRealm())).data;
        const otherProvider = (await suite.client.identityProvider.create(createFakeOAuth2IdentityProvider({
            realmId: otherRealm.id,
            tokenUrl: `${idpURL}/token`,
            authorizeUrl: `${idpURL}/authorize`,
        }))).data;

        const response = await httpRequest(suite, 'POST', `identity-providers/${otherProvider.id}/link-request`, {
            headers: {
                Authorization: `Bearer ${userToken}`,
                'user-agent': USER_AGENT,
            },
        });
        expect(response.status).toEqual(400);
    });

    it('surfaces an external failure as link_failed', async () => {
        // a fresh external subject whose token endpoint answer is broken
        externalUserId = '';

        const { state } = await requestLink(userToken);
        const target = await completeCallback(state);

        expect(target.searchParams.get('linkError')).toEqual('link_failed');

        externalUserId = 'external-user-1';
    });

    it('logs the upstream answer when the token exchange is rejected', async () => {
        tokenEndpointError = { error: 'invalid_request', error_description: 'code is invalid' };
        logLines.length = 0;

        const { state } = await requestLink(userToken);
        const target = await completeCallback(state);

        expect(target.searchParams.get('linkError')).toEqual('link_failed');

        const log = logLines.join('\n');
        expect(log).toContain('upstream status: 400');
        expect(log).toContain('code is invalid');

        tokenEndpointError = undefined;
    });

    it('rejects a link state replayed against a different provider callback', async () => {
        // a second provider in the same realm; a state minted for `provider`
        // must not complete a link on `otherProvider`'s callback.
        const otherProvider = (await suite.client.identityProvider.create(createFakeOAuth2IdentityProvider({
            realmId: realm.id,
            tokenUrl: `${idpURL}/token`,
            authorizeUrl: `${idpURL}/authorize`,
        }))).data;

        const { state } = await requestLink(userToken);

        const response = await httpRequest(
            suite,
            'GET',
            `identity-providers/${otherProvider.id}/authorize-in?state=${state}&code=any-code`,
            {
                headers: { 'user-agent': USER_AGENT },
                redirect: 'manual',
            },
        );
        expect(response.status).toEqual(302);
        const target = new URL(response.headers.get('location') as string);
        expect(target.searchParams.get('linked')).toBeNull();
        expect(target.searchParams.get('linkError')).toEqual('link_failed');
    });
});
