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

    const httpClient = createFakeHTTPClient();

    beforeAll(async () => {
        suite.container.register(HTTPInjectionKey.UIHttpClient, { useValue: httpClient });

        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should serve the authorize page for a valid code request', async () => {
        const scope = await suite.client.scope.getOne(ScopeName.GLOBAL);
        const client = await suite.client.client.create(createFakeClient());
        await suite.client.clientScope.create({
            scope_id: scope.id,
            client_id: client.id,
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

        const body = await response.text();
        const payload = extractHydrationPayload(body);

        expect(payload.data.error).toBeUndefined();
        expect(payload.data.client.id).toEqual(client.id);
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
