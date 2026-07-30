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
import { createFakeClient as createFakeHTTPClient } from '@authup/core-http-kit/testing';
import { HTTPInjectionKey } from '../../../../../src/app';
import { createFakeClient, httpRequest } from '../../../../utils';
import { createTestApplication } from '../../../../app';

function extractHydrationPayload(body: string) : Record<string, any> {
    const match = body.match(/window\.__AUTHUP__ = (.+);/);
    expect(match).toBeTruthy();
    return JSON.parse(match![1]);
}

describe('src/http/controllers/workflows (SSR pages)', () => {
    const suite = createTestApplication();

    const identityProvider = {
        id: '9c1b1c2a-4c1b-4c1b-9c1b-1c2a4c1b4c1b',
        name: 'example',
        displayName: 'Example Provider',
        protocol: 'oidc',
        realmId: null,
    };

    const httpClient = createFakeHTTPClient({
        handlers: {
            // consent covering probe (plan 055) — logged-in authorize renders
            // fire it; an empty collection means "not covered" (re-prompt)
            'GET /consents': () => ({ data: [], meta: { total: 0 } }),
            'GET /identity-providers': () => ({
                data: [identityProvider],
                meta: {
                    total: 1,
                    limit: 10,
                    offset: 0,
                },
            }),
        },
    });

    beforeAll(async () => {
        suite.container.register(HTTPInjectionKey.UIHttpClient, { useFactory: () => httpClient }, { lifetime: 'transient' });

        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should serve the authorize page for a valid code request', async () => {
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

        // clickjacking guard — the page hydrates logged-in state, so framing must
        // be denied for the click-gated auto-consent/sign-out to be a real defense
        expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
        expect(response.headers.get('x-frame-options')).toEqual('DENY');

        const body = await response.text();
        const payload = extractHydrationPayload(body);

        expect(payload.data.error).toBeUndefined();
        expect(payload.data.client.id).toEqual(client.id);
        // the anonymous hydration payload carries only the trimmed client DTO —
        // never redirectUri patterns, grantTypes, internal URLs, or the secret
        expect(payload.data.client.redirectUri).toBeUndefined();
        expect(payload.data.client.grantTypes).toBeUndefined();
        expect(payload.data.client.secret).toBeUndefined();
        expect(payload.data.codeRequest.client_id).toEqual(client.id);
        expect(payload.data.features).toBeDefined();
        expect(payload.data.requestPath).toMatch(/^\/authorize\?/);
    });

    it('should serve the authorize page with an embedded error for an invalid request', async () => {
        const response = await httpRequest(suite, 'GET', '/authorize?response_type=code&client_id=unknown');
        expect(response.status).toEqual(200);

        const payload = extractHydrationPayload(await response.text());
        expect(payload.data.error).toBeDefined();
        expect(payload.data.client).toBeUndefined();
    });

    it('should render collections during the SSR and hand them to the client', async () => {
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
        const body = await response.text();
        const payload = extractHydrationPayload(body);

        // the login form's identity-provider list is loaded while rendering,
        // so it is already in the markup ...
        expect(body).toContain('Example Provider');

        // ... and travels in the payload, so the hydrating client adopts it
        // instead of fetching the same collection again
        const keys = Object.keys(payload.hydration || {});
        const key = keys.find((entry) => entry.startsWith('authup:collection:identityProvider'));
        expect(key).toBeDefined();
        expect(payload.hydration[key!].data).toEqual([identityProvider]);
        expect(payload.hydration[key!].total).toEqual(1);
    });

    it('should serve the register page with feature flags', async () => {
        const response = await httpRequest(suite, 'GET', '/register');
        expect(response.status).toEqual(200);

        const payload = extractHydrationPayload(await response.text());
        expect(payload.data.features.registration).toEqual(true);
        expect(payload.data.features.passwordRecovery).toEqual(true);
    });

    it('should escape script-breaking characters in the hydration payload', async () => {
        const token = '</script><script>alert(1)</script>';
        const query = new URLSearchParams({ token });

        const response = await httpRequest(suite, 'GET', `/password-reset?${query.toString()}`);
        expect(response.status).toEqual(200);

        const body = await response.text();
        expect(body).not.toContain('</script><script>alert(1)');

        const payload = extractHydrationPayload(body);
        expect(payload.data.token).toEqual(token);
    });

    it('should pass a relative redirect through to the page', async () => {
        const redirect = '/authorize?client_id=web&response_type=code';
        const query = new URLSearchParams({ redirect });

        const response = await httpRequest(suite, 'GET', `/register?${query.toString()}`);
        const payload = extractHydrationPayload(await response.text());

        expect(payload.data.redirect).toEqual(redirect);
    });

    it('should drop absolute and protocol-relative redirects', async () => {
        const response = await httpRequest(suite, 'GET', '/register?redirect=//evil.example/phish');
        const payload = extractHydrationPayload(await response.text());

        expect(payload.data.redirect).toBeUndefined();
    });
});
