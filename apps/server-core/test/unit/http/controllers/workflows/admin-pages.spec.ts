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
import { httpRequest } from '../../../../utils';
import { createTestApplication } from '../../../../app';

function extractConfig(body: string) : Record<string, any> {
    const match = body.match(/window\.__AUTHUP__ = (.+);<\/script>/);
    expect(match).toBeTruthy();
    return JSON.parse(match![1]);
}

/**
 * The admin console SPA shell (plan 081): the same serving seam as the
 * account console, at /admin, with a multi-segment catch-all because the
 * console's routes nest (`/users/<id>/roles`).
 */
describe('src/http/controllers/workflows/admin (SPA shell)', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should serve the admin console shell with injected config', async () => {
        const response = await httpRequest(suite, 'GET', '/admin');
        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toContain('text/html');
        expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
        expect(response.headers.get('x-frame-options')).toEqual('DENY');
        expect(response.headers.get('cache-control')).toEqual('no-store');

        const body = await response.text();
        const config = extractConfig(body);

        expect(typeof config.apiUrl).toEqual('string');
        expect(config.basePath).toEqual('/admin');
        expect(config.features.adminConsole).toEqual(true);
        // capability assertion: this server implements /admin/login|callback
        expect(config.cookieSession).toEqual(true);
    });

    it('should serve the same shell for nested sub-paths', async () => {
        for (const path of [
            '/admin/users',
            '/admin/users/9b2d6b6e-8b0a-4c1e-9a3f-1c1f7a1c2d3e/roles',
            '/admin/UNKNOWN',
        ]) {
            const response = await httpRequest(suite, 'GET', path);
            expect(response.status).toEqual(200);
            expect(response.headers.get('content-type')).toContain('text/html');
        }
    });

    // The SPA owns /login (where the guard sends a signed-out visitor and
    // where a refused callback lands with its ?error= marker); the same URL
    // with a realmId is the server-side kick. Both must keep working.
    it('should serve the shell for the console login page', async () => {
        for (const path of ['/admin/login', '/admin/login?error=access_denied', '/admin/login?redirect=%2Fusers']) {
            const response = await httpRequest(suite, 'GET', path);
            expect(response.status).toEqual(200);
            expect(response.headers.get('content-type')).toContain('text/html');
        }

        const kick = await httpRequest(suite, 'GET', '/admin/login?realmId=master', { redirect: 'manual' });
        expect(kick.status).toEqual(302);
    });

    it('should answer 404 for a missing asset instead of the shell', async () => {
        const response = await httpRequest(suite, 'GET', '/admin/assets/does-not-exist.js');
        expect(response.status).toEqual(404);
    });

    it('should serve the bundle assets', async () => {
        const shell = await (await httpRequest(suite, 'GET', '/admin')).text();

        const match = shell.match(/src="(\/admin\/assets\/[^"]+\.js)"/);
        expect(match).toBeTruthy();

        const response = await httpRequest(suite, 'GET', match![1]);
        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toContain('javascript');
    });

    it('should carry no server-rendered per-user state', async () => {
        const body = await (await httpRequest(suite, 'GET', '/admin/users')).text();

        expect(body.match(/window\.__AUTHUP__ =/g)).toHaveLength(1);

        const config = extractConfig(body);
        expect(Object.keys(config).sort()).toEqual(['apiUrl', 'basePath', 'cookieSession', 'features']);
    });
});
