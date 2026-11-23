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
import { createHash } from 'node:crypto';
import { serve } from 'routup/node';
import { createHandler } from '../../src/index.ts';

/**
 * The service serves the BUILT `@authup/client-account-console` bundle, so
 * this suite needs it built, like every console page spec that came before
 * it.
 */
describe('createHandler', () => {
    let baseURL : string;
    let server : ReturnType<typeof serve>;

    const config = {
        url: 'https://example.com/console/account',
        apiUrl: 'https://example.com',
        enabled: true,
        cspEnabled: true,
        port: 3022,
        host: '',
        distPath: '',
        trustedOrigins: ['https://admin.example.com'],
        theme: {
            directoryPath: '',
            fragmentsEnabled: false,
        },
    };

    beforeAll(async () => {
        server = serve(await createHandler(config), { port: 0, silent: true });
        await server.ready();

        baseURL = (server.url ?? '').replace(/\/+$/, '');
        expect(baseURL).toBeTruthy();
    });

    afterAll(async () => {
        // `true` closes active connections, the same rule the module's own
        // teardown follows: a console answers over keep-alive sockets, so
        // waiting for them to go idle means waiting out the client's timeout,
        // which under a loaded parallel run outlasts the hook budget.
        await server.close(true);
    });

    it('should answer the health route', async () => {
        const response = await fetch(`${baseURL}/healthy`);

        expect(response.status).toEqual(200);
    });

    it('should answer /livez and /readyz', async () => {
        const live = await fetch(`${baseURL}/livez`);

        expect(live.status).toEqual(200);
        expect(live.headers.get('cache-control')).toEqual('no-store');
        expect(await live.json()).toEqual({ healthy: true, checks: [] });

        const ready = await fetch(`${baseURL}/readyz`);

        expect(ready.status).toEqual(200);
        expect(ready.headers.get('cache-control')).toEqual('no-store');
        expect(await ready.json()).toEqual({ healthy: true, checks: [{ name: 'shutdown', ok: true }] });
    });

    it('should serve the shell with the runtime configuration injected', async () => {
        const response = await fetch(`${baseURL}/`);

        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toContain('text/html');

        // the console is an authenticated first-party surface: framing
        // denied, never cached
        expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
        expect(response.headers.get('x-frame-options')).toEqual('DENY');
        expect(response.headers.get('cache-control')).toEqual('no-store');
        expect(response.headers.get('vary')).toContain('cookie');

        const body = await response.text();

        // the marker was replaced, not merely present
        expect(body).not.toContain('<!--account-config-->');
        expect(body).toContain('window.__AUTHUP__');

        // the payload names the API, not this service: the console derives
        // its http client and its cookie path from it
        expect(body).toContain('"apiUrl":"https://example.com"');
        expect(body).toContain('"basePath":"/console/account"');
        // a capability assertion of this deployment, not an operator setting
        expect(body).toContain('"cookieSession":true');
        expect(body).toContain('"accountConsole":true');
    });

    it('should send a script policy admitting exactly the injected config script', async () => {
        const response = await fetch(`${baseURL}/`);
        const body = await response.text();

        const scripts = body.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g).toArray()
            .map((match) => match[1] ?? '')
            .filter((content) => content.length > 0);

        // the config is the shell's one inline script, or the policy would
        // refuse the rest of the console
        expect(scripts).toHaveLength(1);

        const hash = createHash('sha256').update(scripts[0] ?? '', 'utf8').digest('base64');
        const policy = response.headers.get('content-security-policy') ?? '';

        expect(policy).toContain(`script-src 'self' 'sha256-${hash}'`);
        expect(policy).toContain("connect-src 'self' https://example.com");
        expect(policy).toContain("object-src 'none'");
        expect(policy).toContain("frame-ancestors 'none'");
    });

    it('should keep the framing-only policy when the operator switched it off', async () => {
        const handler = await createHandler({ ...config, cspEnabled: false });

        const local = serve(handler, { port: 0, silent: true });

        await local.ready();

        try {
            const url = (local.url ?? '').replace(/\/+$/, '');
            const response = await fetch(`${url}/`);

            expect(response.headers.get('content-security-policy')).toEqual("frame-ancestors 'none'");
        } finally {
            await local.close(true);
        }
    });

    it('should keep the framing-only policy when an operator head fragment may carry scripts', async () => {
        const handler = await createHandler({
            ...config,
            theme: { ...config.theme, fragmentsEnabled: true },
        });

        const local = serve(handler, { port: 0, silent: true });

        await local.ready();

        try {
            const url = (local.url ?? '').replace(/\/+$/, '');
            const response = await fetch(`${url}/`);

            expect(response.headers.get('content-security-policy')).toEqual("frame-ancestors 'none'");
        } finally {
            await local.close(true);
        }
    });

    it('should serve the same shell for a console route', async () => {
        const response = await fetch(`${baseURL}/sessions`);

        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toContain('text/html');

        const body = await response.text();

        expect(body).toContain('window.__AUTHUP__');
    });

    it('should inject a back link from a trusted origin', async () => {
        const body = await (await fetch(
            `${baseURL}/?ref=${encodeURIComponent('https://admin.example.com/users')}`,
        )).text();

        expect(body).toContain('"ref":"https://admin.example.com/users"');
    });

    it('should drop a back link from a foreign origin', async () => {
        const body = await (await fetch(
            `${baseURL}/?ref=${encodeURIComponent('https://evil.test/users')}`,
        )).text();

        expect(body).not.toContain('evil.test');
    });

    it('should serve an asset the shell references', async () => {
        const body = await (await fetch(`${baseURL}/`)).text();

        const match = body.match(/src="([^"]*\/assets\/[^"]+\.js)"/);

        expect(match).toBeTruthy();

        // the href is public-path shaped; the proxy strips the service's own
        // prefix, so the service itself serves it under /assets
        const assetPath = match![1].replace('/console/account', '');
        const asset = await fetch(`${baseURL}${assetPath}`);

        expect(asset.status).toEqual(200);
        expect(asset.headers.get('content-type')).toContain('javascript');
    });

    it('should answer a missing asset with 404 rather than the shell', async () => {
        const response = await fetch(`${baseURL}/assets/does-not-exist.js`);

        expect(response.status).toEqual(404);
        expect(response.headers.get('content-type') ?? '').not.toContain('text/html');
    });

    it('serves a substituted shell while keeping the config splice and the page headers', async () => {
        const substituted = await createHandler(
            config,
            undefined,
            async () => '<!doctype html><html><head></head><body><div id="substituted-shell"></div><!--account-config--></body></html>',
        );

        const local = serve(substituted, { port: 0, silent: true });

        await local.ready();

        try {
            const url = (local.url ?? '').replace(/\/+$/, '');
            const response = await fetch(`${url}/`);
            const body = await response.text();

            expect(response.status).toEqual(200);
            expect(body).toContain('substituted-shell');
            expect(body).not.toContain('/assets/');
            expect(body).toContain('window.__AUTHUP__');
            expect(body).toContain('"cookieSession":true');
            expect(response.headers.get('cache-control')).toEqual('no-store');
            // a dev server's shell loads its own client, so no script policy
            expect(response.headers.get('content-security-policy')).toEqual("frame-ancestors 'none'");
        } finally {
            await local.close(true);
        }
    });
});
