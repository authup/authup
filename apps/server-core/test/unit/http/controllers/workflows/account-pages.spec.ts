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
import { createFakeClient as createFakeHTTPClient } from '@authup/core-http-kit/testing';
import { HTTPInjectionKey } from '../../../../../src/app';
import { httpRequest } from '../../../../utils';
import { createTestApplication } from '../../../../app';

function extractHydrationPayload(body: string) : Record<string, any> {
    const match = body.match(/window\.__AUTHUP__ = (.+);/);
    expect(match).toBeTruthy();
    return JSON.parse(match![1]);
}

describe('src/http/controllers/workflows/account (SSR page)', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        suite.container.register(
            HTTPInjectionKey.UIHttpClient,
            { useFactory: () => createFakeHTTPClient() },
            { lifetime: 'transient' },
        );

        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should serve the account page', async () => {
        const response = await httpRequest(suite, 'GET', '/account');
        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toContain('text/html');

        const payload = extractHydrationPayload(await response.text());
        expect(payload.data.features).toBeDefined();
        expect(payload.data.features.accountConsole).toEqual(true);
    });

    it('should serve account sub-pages', async () => {
        const response = await httpRequest(suite, 'GET', '/account/sessions');
        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toContain('text/html');
    });

    it('should fall back to the account root for an unknown sub-path', async () => {
        const response = await httpRequest(suite, 'GET', '/account/UNKNOWN');
        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toContain('text/html');
    });

    it('should pass a realm hint through the hydration payload', async () => {
        const response = await httpRequest(suite, 'GET', '/account?realmId=master');
        const payload = extractHydrationPayload(await response.text());

        expect(payload.data.realmId).toEqual('master');
    });

    it('should not record actor-scoped collections during the server render', async () => {
        // Auth-gated content renders client-side only (the page's mounted
        // gate) — the shared hydration bucket must stay free of collection
        // snapshots, whose keys carry no actor and would otherwise be
        // computable cross-user.
        const response = await httpRequest(suite, 'GET', '/account/sessions');
        const payload = extractHydrationPayload(await response.text());

        const keys = Object.keys(payload.hydration || {});
        expect(keys.filter((key) => key.startsWith('authup:collection:'))).toHaveLength(0);
    });
});

describe('src/http/controllers/workflows/account (disabled)', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.accountConsoleEnabled = false;
        },
    });

    beforeAll(async () => {
        suite.container.register(
            HTTPInjectionKey.UIHttpClient,
            { useFactory: () => createFakeHTTPClient() },
            { lifetime: 'transient' },
        );

        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should serve the disabled notice instead of the surface', async () => {
        const response = await httpRequest(suite, 'GET', '/account');
        expect(response.status).toEqual(200);

        const body = await response.text();
        const payload = extractHydrationPayload(body);

        expect(payload.data.features.accountConsole).toEqual(false);
        // the localized notice renders server-side (no auth gate on it)
        expect(body).toContain('This feature is not enabled.');
    });

    it('should report the flag on the status endpoint', async () => {
        const response = await suite.client.status.get();

        expect(response.features.accountConsole).toEqual(false);
    });
});
