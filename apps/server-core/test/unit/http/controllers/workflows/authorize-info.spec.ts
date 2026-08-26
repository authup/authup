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
import { OAuth2ErrorCode } from '@authup/specs';
import { createFakeClient, httpRequest } from '../../../../utils';
import { createTestApplication } from '../../../../app';

/**
 * `GET /authorize/info` answers the render input the `/authorize` page is
 * built from, so a renderer outside this process can produce the same page
 * (plan 101 D2). The assertions mirror the payload half of
 * `ui-pages.spec.ts`: what the two routes report must not drift, since the
 * page reads the very same object.
 *
 * The route itself renders nothing, so it needs no fake UI http client. The
 * last case renders the page to compare the two answers, so the suite does
 * need the built `@authup/client-auth-console` dist like every other page
 * spec here.
 */
describe('src/http/controllers/workflows/authorize (info)', () => {
    const suite = createTestApplication();

    let client : Client;

    beforeAll(async () => {
        await suite.setup();

        const { data: scope } = await suite.client.scope.getOne(ScopeName.GLOBAL);
        const { data: created } = await suite.client.client.create(createFakeClient());
        await suite.client.clientScope.create({ scopeId: scope.id, clientId: created.id });

        client = created;
    });

    afterAll(async () => {
        await suite.teardown();
    });

    function buildQuery(extra: Record<string, string> = {}) {
        return new URLSearchParams({
            response_type: 'code',
            client_id: client.id,
            redirect_uri: 'https://example.com/redirect',
            scope: ScopeName.GLOBAL,
            ...extra,
        });
    }

    function request(query: URLSearchParams) {
        return httpRequest(suite, 'GET', `/authorize/info?${query.toString()}`);
    }

    it('should answer the render input of a valid code request', async () => {
        const response = await request(buildQuery());

        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toContain('application/json');
        // a login context, never served from a cache
        expect(response.headers.get('cache-control')).toEqual('no-store');

        const body = await response.json();

        expect(body.error).toBeUndefined();
        expect(body.codeRequest.client_id).toEqual(client.id);
        expect(body.codeRequest.redirect_uri).toEqual('https://example.com/redirect');
        expect(body.redirectUriVerified).toEqual(true);
        expect(body.realm).toBeDefined();
        expect(body.realm.id).toEqual(client.realmId);
        expect(Array.isArray(body.scopes)).toBe(true);
        expect(body.scopes.map((scope: { name: string }) => scope.name)).toContain(ScopeName.GLOBAL);
        expect(body.features).toBeDefined();
        expect(body.features.registration).toEqual(true);
    });

    it('should carry only the trimmed client summary', async () => {
        const body = await (await request(buildQuery())).json();

        expect(Object.keys(body.client).sort()).toEqual([
            'builtIn',
            'createdAt',
            'displayName',
            'id',
            'name',
        ]);

        // the route is anonymous, so the row must never disclose the
        // redirect_uri patterns, the grant types, the internal URLs, the
        // authentication method or the secret storage flags
        expect(body.client.redirectUri).toBeUndefined();
        expect(body.client.postLogoutRedirectUri).toBeUndefined();
        expect(body.client.grantTypes).toBeUndefined();
        expect(body.client.baseUrl).toBeUndefined();
        expect(body.client.rootUrl).toBeUndefined();
        expect(body.client.authMethod).toBeUndefined();
        expect(body.client.secret).toBeUndefined();
        expect(body.client.secretHashed).toBeUndefined();
        expect(body.client.accessPolicyId).toBeUndefined();
    });

    it('should require no credential', async () => {
        // httpRequest sends no Authorization header at all, and the
        // suite's own client is the admin one, so this is the assertion
        // that the route is reachable by the anonymous visitor the page
        // serves. It also answers through the typed client.
        const anonymous = await request(buildQuery());
        expect(anonymous.status).toEqual(200);

        const typed = await suite.client.authorize.getInfo({
            response_type: 'code',
            client_id: client.id,
            redirect_uri: 'https://example.com/redirect',
            scope: ScopeName.GLOBAL,
        });

        expect(typed.client?.id).toEqual(client.id);
        expect(typed.codeRequest?.client_id).toEqual(client.id);
        expect(typed.redirectUriVerified).toEqual(true);
    });

    it('should forward a raw search string untouched', async () => {
        // what a renderer in front of this endpoint hands over: the
        // browser's own query, re-parsed by nobody
        const query = buildQuery({ state: 'a b&c' });

        const leading = await suite.client.authorize.getInfo(`?${query.toString()}`);
        expect(leading.codeRequest?.state).toEqual('a b&c');
        expect(leading.client?.id).toEqual(client.id);

        const bare = await suite.client.authorize.getInfo(query.toString());
        expect(bare.codeRequest?.state).toEqual('a b&c');
    });

    it('should point requestPath at the page, not at itself', async () => {
        // The page renders it as the `redirect` parameter on its register
        // and password links, so it has to lead back to the page.
        const body = await (await request(buildQuery())).json();

        expect(body.requestPath).toMatch(/^\/authorize\?/);
        expect(body.requestPath).not.toContain('/authorize/info');
        expect(body.requestPath).toContain(`client_id=${client.id}`);
    });

    it('should hand over the federated provider hint and keep it out of requestPath', async () => {
        const PROVIDER_ID = '3f1d2c4e-7a4b-4c2e-9c8d-0b1a2c3d4e5f';

        const body = await (await request(buildQuery({ provider: PROVIDER_ID }))).json();

        // no secret in the answer: the pending login rides a cookie
        expect(body.federatedLogin).toEqual({ providerId: PROVIDER_ID });
        expect(body.requestPath).not.toContain('provider=');

        // a value that is not an id never reaches the renderer
        const injected = await (await request(buildQuery({ provider: '../token?' }))).json();
        expect(injected.federatedLogin).toBeUndefined();
    });

    it('should answer a refused request with the refusal embedded', async () => {
        const response = await httpRequest(suite, 'GET', '/authorize/info?response_type=code&client_id=unknown');

        // the refusal is what the page renders, so it is a 200 and not an
        // error status
        expect(response.status).toEqual(200);

        const body = await response.json();

        expect(body.error).toBeDefined();
        // the declared shape: a message to render and a code to branch on.
        // It is data, never an Error, so nothing else is guaranteed.
        expect(typeof body.error.message).toEqual('string');
        expect(typeof body.error.code).toEqual('string');
        expect(body.error.name).toBeUndefined();
        expect(body.error.stack).toBeUndefined();
        expect(body.client).toBeUndefined();
        expect(body.codeRequest).toBeUndefined();
        expect(body.redirectUriVerified).toEqual(false);
        // the flags the renderer needs are there regardless
        expect(body.features).toBeDefined();
        expect(body.requestPath).toMatch(/^\/authorize\?/);
    });

    it('should map a recognized error marker and ignore any other', async () => {
        // the federated callback bounces a disabled provider here with
        // this marker; the text is server-side, never request-derived
        let body = await (await request(buildQuery({ error: OAuth2ErrorCode.LOGIN_REQUIRED }))).json();
        expect(body.error).toMatchObject({
            code: ErrorCode.OAUTH_LOGIN_REQUIRED,
            message: 'The identity provider is not available. Return to the application and start the login again.',
        });
        expect(body.client.id).toEqual(client.id);

        body = await (await request(buildQuery({ error: OAuth2ErrorCode.ACCESS_DENIED }))).json();
        expect(body.error).toMatchObject({ code: ErrorCode.OAUTH_ACCESS_DENIED });
        expect(body.client.id).toEqual(client.id);

        // the marker set is closed
        body = await (await request(buildQuery({ error: 'whatever' }))).json();
        expect(body.error).toBeUndefined();
        expect(body.client.id).toEqual(client.id);
    });

    it('should report an unverified redirect_uri', async () => {
        const body = await (await request(buildQuery({ redirect_uri: 'https://attacker.test/cb' }))).json();

        // a redirect_uri matching no registered pattern is refused
        // outright, so the renderer never offers a way back
        expect(body.error).toBeDefined();
        expect(body.redirectUriVerified).toEqual(false);
    });

    it('should answer the same context the page renders', async () => {
        // the two routes read one builder; this fails if they ever stop
        const query = buildQuery();

        const info = await (await request(query)).json();

        const page = await httpRequest(suite, 'GET', `/authorize?${query.toString()}`);
        expect(page.status).toEqual(200);

        const match = (await page.text()).match(/window\.__AUTHUP__ = (.+);/);
        expect(match).toBeTruthy();

        expect(JSON.parse(match![1]).data).toEqual(info);
    });
});
