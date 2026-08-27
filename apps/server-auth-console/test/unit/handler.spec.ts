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
import { createAuthConsoleHandler, rebaseConsoleAssets } from '../../src';

/**
 * The service renders the BUILT `@authup/client-auth-console` bundle, so
 * this suite needs it built, like every page spec that came before it.
 *
 * `/logout` is the page the service can answer with no backend at all: it
 * drives the end-session call from the browser, so the render is a pure
 * shell. That makes it the honest smoke test for the render plumbing.
 */
describe('createAuthConsoleHandler', () => {
    let baseURL : string;
    let server : ReturnType<typeof serve>;

    const config = {
        url: 'https://example.com/console/auth',
        apiUrl: 'https://example.com',
    };

    beforeAll(async () => {
        server = serve(createAuthConsoleHandler(config), { port: 0, silent: true });
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

    it('should render the logout page with no backend', async () => {
        const response = await fetch(`${baseURL}/logout`);

        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toContain('text/html');

        // the console pages are login surfaces: framing denied, never cached
        expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
        expect(response.headers.get('x-frame-options')).toEqual('DENY');
        expect(response.headers.get('cache-control')).toEqual('no-store');
        expect(response.headers.get('vary')).toContain('cookie');

        const body = await response.text();

        // the shell was rendered, not merely served
        expect(body).toContain('<div id="app">');
        expect(body).not.toContain('<!--app-html-->');

        // the payload names the API, not this service, because the console
        // derives its http client and its cookie path from it
        expect(body).toContain('"baseURL":"https://example.com"');
        expect(body).toContain('"basePath":"/console/auth"');
    });

    it('should serve an asset the shell references', async () => {
        const body = await (await fetch(`${baseURL}/logout`)).text();

        const match = body.match(/src="([^"]*\/assets\/[^"]+\.js)"/);
        expect(match).toBeTruthy();

        // the href is public-path shaped; the proxy strips the service's own
        // prefix, so the service itself serves it under /assets
        const assetPath = match![1].replace('/console/auth', '');
        const asset = await fetch(`${baseURL}${assetPath}`);

        expect(asset.status).toEqual(200);
        expect(asset.headers.get('content-type')).toContain('javascript');
    });
});

describe('rebaseConsoleAssets', () => {
    const SHELL = '<script src="/console/auth/assets/index-abc.js"></script>' +
        '<link href="/console/auth/assets/index-def.css">';

    // The invariant: the emitted href must be the service's own public path
    // plus the route the assets are mounted on, which is /assets. The vite
    // base in the bundle is fixed at build time and says nothing about where
    // the service is published, so it is replaced rather than prefixed.
    it.each([
        // the default: published at the vite base, so the href is unchanged
        ['https://example.com/console/auth', '/console/auth/assets/'],
        // authup under a sub-path
        ['https://example.com/auth/console/auth', '/auth/console/auth/assets/'],
        // published somewhere that does NOT end in the vite base: prefixing
        // would emit /login/console/auth/assets/, which nothing serves once
        // the proxy has stripped /login
        ['https://example.com/login', '/login/assets/'],
        // at the origin root
        ['https://example.com', '/assets/'],
    ])('rebases %s onto %s', (url, expected) => {
        const html = rebaseConsoleAssets(SHELL, url);

        expect(html).toContain(`src="${expected}index-abc.js"`);
        expect(html).toContain(`href="${expected}index-def.css"`);
    });
});
