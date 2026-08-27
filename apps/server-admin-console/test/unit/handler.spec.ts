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
import { serve } from 'routup/node';
import { createAdminConsoleHandler } from '../../src';

/**
 * The service serves the BUILT `@authup/client-admin-console` bundle, so this
 * suite needs it built, like every console page spec that came before it.
 */
describe('createAdminConsoleHandler', () => {
    let baseURL : string;
    let server : ReturnType<typeof serve>;

    const config = {
        url: 'https://example.com/console/admin',
        apiUrl: 'https://example.com',
        enabled: true,
        port: 3021,
        host: '',
        distPath: '',
        themeDirectoryPath: '',
        themeFragmentsEnabled: false,
    };

    beforeAll(async () => {
        server = serve(await createAdminConsoleHandler(config), { port: 0, silent: true });
        await server.ready();

        baseURL = (server.url ?? '').replace(/\/+$/, '');
        expect(baseURL).toBeTruthy();
    });

    afterAll(async () => {
        await server.close();
    });

    it('should answer the health route', async () => {
        const response = await fetch(`${baseURL}/healthy`);

        expect(response.status).toEqual(200);
    });

    it('should serve the shell with the runtime configuration injected', async () => {
        const response = await fetch(`${baseURL}/`);

        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toContain('text/html');

        // the console is a login surface: framing denied, never cached
        expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
        expect(response.headers.get('x-frame-options')).toEqual('DENY');
        expect(response.headers.get('cache-control')).toEqual('no-store');
        expect(response.headers.get('vary')).toContain('cookie');

        const body = await response.text();

        // the marker was replaced, not merely present
        expect(body).not.toContain('<!--admin-config-->');
        expect(body).toContain('window.__AUTHUP__');

        // the payload names the API, not this service: the console derives
        // its http client and its cookie path from it
        expect(body).toContain('"apiUrl":"https://example.com"');
        expect(body).toContain('"basePath":"/console/admin"');
        // a capability assertion of this deployment, not an operator setting
        expect(body).toContain('"cookieSession":true');
        expect(body).toContain('"adminConsole":true');
    });

    it('should serve the same shell for a nested console route', async () => {
        const response = await fetch(`${baseURL}/users/abc/roles`);

        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toContain('text/html');

        const body = await response.text();
        expect(body).toContain('window.__AUTHUP__');
    });

    it('should serve an asset the shell references', async () => {
        const body = await (await fetch(`${baseURL}/`)).text();

        const match = body.match(/src="([^"]*\/assets\/[^"]+\.js)"/);
        expect(match).toBeTruthy();

        // the href is public-path shaped; the proxy strips the service's own
        // prefix, so the service itself serves it under /assets
        const assetPath = match![1].replace('/console/admin', '');
        const asset = await fetch(`${baseURL}${assetPath}`);

        expect(asset.status).toEqual(200);
        expect(asset.headers.get('content-type')).toContain('javascript');
    });

    it('should answer a missing asset with 404 rather than the shell', async () => {
        const response = await fetch(`${baseURL}/assets/does-not-exist.js`);

        expect(response.status).toEqual(404);
        expect(response.headers.get('content-type') ?? '').not.toContain('text/html');
    });
});
