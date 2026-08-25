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
import { ScopeName } from '@authup/core-kit';
import { ConfigInjectionKey, HTTPInjectionKey } from '../../../../../src/app';
import { createFakeClient, createFakeOAuth2IdentityProvider, httpRequest } from '../../../../utils';
import { createTestApplication } from '../../../../app';
import type { TestHTTPApplication } from '../../../../app';

/**
 * Unlike ui-pages.spec.ts, no fake UI http client is registered here — the
 * suites exercise the DEFAULT client wired by `HTTPModule.setup`, whose
 * transport rewrites requests targeting the public base URL onto the
 * server's own listen address. The SSR renders therefore fetch from the
 * live test server itself (the identity-provider list is loaded
 * fire-and-forget during the render, so its DATA is asserted through the
 * resolved client, not the emitted HTML).
 */
async function renderAuthorizePage(suite: TestHTTPApplication) : Promise<string> {
    const { data: scope } = await suite.client.scope.getOne(ScopeName.GLOBAL);
    const { data: client } = await suite.client.client.create(createFakeClient());
    await suite.client.clientScope.create({
        scopeId: scope.id,
        clientId: client.id,
    });

    const query = new URLSearchParams({
        response_type: 'code',
        client_id: client.id,
        redirect_uri: 'https://example.com/redirect',
        scope: ScopeName.GLOBAL,
    });

    const response = await httpRequest(suite, 'GET', `/authorize?${query.toString()}`);
    expect(response.status).toEqual(200);
    expect(response.headers.get('content-type')).toContain('text/html');

    return response.text();
}

describe('src/http/controllers/workflows (SSR pages, internal client)', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should dispatch against the listen address while keeping the public baseURL', async () => {
        const { data: provider } = await suite.client.identityProvider.create(createFakeOAuth2IdentityProvider());

        const config = suite.container.resolve(ConfigInjectionKey);
        const uiHttpClient = suite.container.resolve(HTTPInjectionKey.UIHttpClient);
        expect(uiHttpClient.getBaseURL()).toEqual(config.publicUrl);
        expect(uiHttpClient.getBaseURL()).not.toContain(suite.baseURL);

        const response = await uiHttpClient.identityProvider.getMany();
        expect(response.data.map((item) => item.id)).toContain(provider.id);
    });

    it('should resolve a fresh client per request', async () => {
        const first = suite.container.resolve(HTTPInjectionKey.UIHttpClient);
        const second = suite.container.resolve(HTTPInjectionKey.UIHttpClient);
        expect(first).not.toBe(second);
    });

    it('should serve the authorize page without leaking the listen address', async () => {
        const body = await renderAuthorizePage(suite);

        expect(body).not.toContain(suite.baseURL);
    });
});

describe('src/http/controllers/workflows (SSR pages, internal client, sub-path public url)', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.publicUrl = 'https://hub.local/auth/';
        },
    });

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should rewrite prefixed public urls onto the listen address', async () => {
        const { data: provider } = await suite.client.identityProvider.create(createFakeOAuth2IdentityProvider());

        const uiHttpClient = suite.container.resolve(HTTPInjectionKey.UIHttpClient);
        expect(uiHttpClient.getBaseURL()).toContain('https://hub.local/auth');

        // an actual https://hub.local dispatch could never resolve here —
        // data proves the transport rewrote origin AND prefix
        const response = await uiHttpClient.identityProvider.getMany();
        expect(response.data.map((item) => item.id)).toContain(provider.id);

        // user-facing URL building stays on the prefixed public base
        expect(uiHttpClient.identityProvider.getAuthorizeUri(provider.id))
            .toContain(`https://hub.local/auth/identity-providers/${provider.id}/`);
    });

    it('should serve the authorize page with prefixed asset urls', async () => {
        const body = await renderAuthorizePage(suite);

        expect(body).toContain('/auth/console/auth/assets/');
        expect(body).not.toContain(suite.baseURL);
    });
});
