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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { serve } from 'routup/node';
import { App, defineCoreHandler } from 'routup';
import { createHandler, resolveConfig } from '../../src';
import type { Config } from '../../src';

const SHELL = '<!doctype html><html><head><!--preload-links--></head><body><div id="app"><!--app-html--></div></body></html>';

const roots : string[] = [];

/**
 * A substituted console package: `package.json` marks the fake server entry
 * as ESM (the service imports it by its exact `server.js` name), and every
 * other file lands under `dist/`.
 */
async function writeBundle(files: Record<string, string>) : Promise<string> {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'authup-auth-console-'));
    roots.push(root);

    await fs.promises.writeFile(path.join(root, 'package.json'), '{"type":"module"}');
    for (const [name, content] of Object.entries(files)) {
        const file = path.join(root, 'dist', name);
        await fs.promises.mkdir(path.dirname(file), { recursive: true });
        await fs.promises.writeFile(file, content);
    }

    return root;
}

afterAll(async () => {
    await Promise.all(roots.map((root) => fs.promises.rm(root, { recursive: true, force: true })));
});

/**
 * The service renders the BUILT `@authup/client-auth-console` bundle, so
 * this suite needs it built, like every page spec that came before it.
 *
 * `/logout` is the page the service can answer with no backend at all: it
 * drives the end-session call from the browser, so the render is a pure
 * shell. That makes it the honest smoke test for the render plumbing.
 */
describe('createHandler', () => {
    let baseURL : string;
    let server : ReturnType<typeof serve>;
    let config : Config;

    beforeAll(async () => {
        config = await resolveConfig({ publicUrl: 'https://example.com' });

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
        // every name carries a content hash, so a new build means new names
        expect(asset.headers.get('cache-control')).toEqual('public,max-age=31536000,immutable');
    });

    it('does not share the resolved bundle between two handlers', async () => {
        // the suite handler has rendered already; once more so the order of
        // the tests above cannot decide what a shared cache would hold
        await (await fetch(`${baseURL}/logout`)).text();

        const root = await writeBundle({
            'client/index.html': SHELL,
            'client/.vite/ssr-manifest.json': '{}',
            'server/server.js': 'export const CONTRACT_VERSION = 3; export async function render() { return ["substituted-bundle", ""]; }',
        });

        const second = serve(
            await createHandler(await resolveConfig({ publicUrl: 'https://example.com', path: root })),
            { port: 0, silent: true },
        );
        await second.ready();

        try {
            const url = (second.url ?? '').replace(/\/+$/, '');

            expect(await (await fetch(`${url}/logout`)).text()).toContain('substituted-bundle');
            expect(await (await fetch(`${baseURL}/logout`)).text()).not.toContain('substituted-bundle');
        } finally {
            await second.close(true);
        }
    });

    it('renders through a substituted render function', async () => {
        const seen : string[] = [];

        const substituted = await createHandler(
            config,
            undefined,
            async (event, _config, ctx) => {
                seen.push(ctx.url);

                return `<!doctype html><html><body>substituted:${ctx.url}</body></html>`;
            },
        );

        const local = serve(substituted, { port: 0, silent: true });
        await local.ready();

        try {
            const url = (local.url ?? '').replace(/\/+$/, '');
            const response = await fetch(`${url}/logout`);

            expect(response.status).toEqual(200);
            expect(await response.text()).toContain('substituted:/logout');
            expect(seen).toEqual(['/logout']);
        } finally {
            await local.close(true);
        }
    });
});

/**
 * A substituted package is a trust boundary the operator crossed on purpose,
 * so the one thing the service can check for them, the render contract, is
 * checked at boot rather than failing per request on `/authorize`.
 */
describe('createHandler bundle contract', () => {
    it('refuses a bundle built against another contract version', async () => {
        const root = await writeBundle({
            'client/index.html': SHELL,
            'server/server.js': 'export const CONTRACT_VERSION = 2; export async function render() { return ["", ""]; }',
        });

        await expect(createHandler(await resolveConfig({ publicUrl: 'https://example.com', path: root })))
            .rejects.toThrow(/render-contract version 2, but this service requires 3/);
    });

    it('reads a bundle without the export as version 1', async () => {
        const root = await writeBundle({
            'client/index.html': SHELL,
            'server/server.js': 'export async function render() { return ["", ""]; }',
        });

        await expect(createHandler(await resolveConfig({ publicUrl: 'https://example.com', path: root })))
            .rejects.toThrow(/render-contract version 1/);
    });

    it('answers the actionable error per request for a half-built bundle', async () => {
    // a client build without the server entry is not a bundle: boot
    // succeeds, and every page names what is missing instead of a raw
    // loader failure
        const root = await writeBundle({ 'client/index.html': SHELL });

        const local = serve(
            await createHandler(await resolveConfig({ publicUrl: 'https://example.com', path: root })),
            { port: 0, silent: true },
        );
        await local.ready();

        try {
            const url = (local.url ?? '').replace(/\/+$/, '');
            const response = await fetch(`${url}/logout`);

            expect(response.status).toEqual(500);
            expect(await response.text()).toContain('not built or installed');
        } finally {
            await local.close(true);
        }
    });
});

/**
 * The regression behind #3550. This is the ONE console that fetches
 * server-side, and it fetched against `publicUrl`, the address a BROWSER
 * reaches the deployment at. A container published as `-p 3001:3000` makes
 * the two different answers, nothing listens on the public port inside, and
 * every hosted auth page answered 502 while `/logout` -- which drives its own
 * call from the browser -- still rendered.
 */
describe('createHandler server-side fetch', () => {
    let api : ReturnType<typeof serve>;
    let apiURL : string;
    const seen : string[] = [];

    beforeAll(async () => {
        const app = new App();
        app.use(defineCoreHandler({
            method: 'get',
            path: '/',
            fn: (event) => {
                seen.push(new URL(event.request.url).pathname);

                return {
                    version: '0.0.0',
                    date: '2026-01-01',
                    features: {
                        registration: true,
                        passwordRecovery: true,
                        emailVerification: false,
                    },
                };
            },
        }));

        api = serve(app, { port: 0, silent: true });
        await api.ready();

        apiURL = (api.url ?? '').replace(/\/+$/, '');
        expect(apiURL).toBeTruthy();
    });

    afterAll(async () => {
        await api.close(true);
    });

    it('should default apiInternalUrl to the public url', async () => {
        // one address for both sides is the ordinary deployment, and it stays
        // configuration-free
        const config = await resolveConfig({ publicUrl: 'https://example.com' });

        expect(config.apiInternalUrl).toEqual(config.apiUrl);
    });

    it('should take apiInternalUrl from the documents internalUrl', async () => {
        // the kubernetes case: the render reaches the API on the cluster
        // network while the browser keeps the ingress address
        const config = await resolveConfig({
            publicUrl: 'https://idp.example.com',
            internalUrl: 'http://authup.authup.svc:3000',
        });

        expect(config.apiUrl).toEqual('https://idp.example.com');
        expect(config.apiInternalUrl).toEqual('http://authup.authup.svc:3000');
    });

    it('should dispatch against apiInternalUrl and still hand the browser the public one', async () => {
        // the shape a port mapping produces, and nothing weaker reproduces
        // it: the published port is a real address the browser reaches and
        // one that nothing listens on HERE, so a server-side call to it is
        // refused. A merely wrong-but-answering public url renders a page
        // built from garbage instead of failing.
        const config = {
            ...await resolveConfig({ publicUrl: 'http://127.0.0.1:1' }),
            apiInternalUrl: apiURL,
        };

        const local = serve(await createHandler(config), { port: 0, silent: true });
        await local.ready();

        try {
            const url = (local.url ?? '').replace(/\/+$/, '');
            // a workflow page, because it is gated on the feature flags this
            // service reads over HTTP: unlike /logout it cannot render
            // without reaching the API, so before the fix this answered 502
            const response = await fetch(`${url}/password-forgot`);

            expect(response.status).toEqual(200);
            expect(seen).toContain('/');

            const body = await response.text();

            expect(body).toContain('<div id="app">');
            // the payload is the BROWSER's, so it keeps naming the public
            // address: repointing it at the internal one is the fix that
            // would break every client-side call the page makes
            expect(body).toContain('"baseURL":"http://127.0.0.1:1"');
            expect(body).not.toContain(apiURL);
        } finally {
            await local.close(true);
        }
    });

    it('should not name the internal address when it cannot be reached', async () => {
        // this service registers no error middleware, so routup answers with
        // the error's own message, and hapic puts the resolved request URL in
        // it. On a split deployment that URL names a service on the
        // operator's network, and this page is the public login surface.
        // a refused port rather than an unresolvable name, so the failure is
        // immediate; what matters is that the value appears in the message
        // hapic builds, not how the connection failed
        const internal = 'http://127.0.0.1:1';
        const config = {
            ...await resolveConfig({ publicUrl: 'https://idp.example.com' }),
            apiInternalUrl: internal,
        };

        const local = serve(await createHandler(config), { port: 0, silent: true });
        await local.ready();

        try {
            const url = (local.url ?? '').replace(/\/+$/, '');

            for (const page of ['/authorize', '/password-forgot']) {
                const response = await fetch(`${url}${page}`);
                expect(response.status).toEqual(500);

                 
                const body = await response.text();
                expect(body).not.toContain(internal);
                expect(body).not.toContain('127.0.0.1:1');
            }
        } finally {
            await local.close(true);
        }
    });
});
