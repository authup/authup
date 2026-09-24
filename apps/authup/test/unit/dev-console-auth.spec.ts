/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { HydrationPayload, RenderContext, RenderResult } from '@authup/client-auth-console';
import { resolveConfig } from '@authup/server-auth-console';
import type { Config } from '@authup/server-auth-console';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { IAppEvent } from 'routup';
import type { EnvironmentModuleGraph, EnvironmentModuleNode, ViteDevServer } from 'vite';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createViteRender } from '../../src/dev/index.ts';
import { captureEvent } from '../utils/event.ts';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'authup-dev-auth-'));
fs.writeFileSync(
    path.join(root, 'index.html'),
    '<html><head><!--preload-links--></head><body><div id="app"><!--app-html--></div></body></html>',
);

let config : Config;

type ViteRenderContext = Pick<
    ViteDevServer,
'transformIndexHtml' | 'ssrLoadModule' | 'ssrFixStacktrace'
> & {
    environments: { ssr: { moduleGraph: Pick<EnvironmentModuleGraph, 'getModuleByUrl'> } },
};

type FakeModule = {
    id: string | null, 
    url: string, 
    importedModules: Set<FakeModule> 
};

function createModuleGraph(entry?: FakeModule) : ViteRenderContext['environments'] {
    return { ssr: { moduleGraph: { getModuleByUrl: async () => entry as EnvironmentModuleNode | undefined } } };
}

/**
 * The render reads the locale and color-mode cookies through
 * `@routup/basic`, so it needs an event the plugin has seen. One real
 * request supplies one, and both cases then call the render directly.
 */
let event : IAppEvent;

beforeAll(async () => {
    config = await resolveConfig({ publicUrl: 'http://localhost:3000' });
    event = await captureEvent('/logout');
});

afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
});

describe('createViteRender', () => {
    it('renders through the source entry and splices the result', async () => {
        let seenPayload : HydrationPayload | undefined;

        const vite : ViteRenderContext = {
            transformIndexHtml: async (_url, html) => html,
            ssrLoadModule: async () => ({
                render: async (ctx: RenderContext) : Promise<RenderResult> => {
                    seenPayload = ctx.payload;

                    return ['<p>page</p>', '<link rel="modulepreload" href="/x.js">'];
                },
            }),
            ssrFixStacktrace: () => undefined,
            environments: createModuleGraph(),
        };

        const render = createViteRender(vite, root);

        const html = await render(event, config, { url: '/logout', data: { a: 1 } });

        expect(html).toContain('<p>page</p>');
        expect(html).toContain('<link rel="modulepreload" href="/x.js">');
        expect(seenPayload?.config.baseURL).toEqual('http://localhost:3000');
        expect(seenPayload?.config.basePath).toEqual('/console/auth');
        expect(seenPayload?.data).toEqual({ a: 1 });
    });

    it('maps the bundled frames back onto the source before rethrowing', async () => {
        let fixed = false;

        const vite : ViteRenderContext = {
            transformIndexHtml: async (_url, html) => html,
            ssrLoadModule: async () => ({
                render: async () => {
                    throw new Error('boom');
                },
            }),
            ssrFixStacktrace: () => { fixed = true; },
            environments: createModuleGraph(),
        };

        const render = createViteRender(vite, root);

        await expect(render(event, config, { url: '/logout', data: {} }))
            .rejects.toThrow('boom');

        expect(fixed).toBe(true);
    });

    it('maps the frames back when the SSR entry itself fails to load', async () => {
        let fixed = false;

        const vite : ViteRenderContext = {
            transformIndexHtml: async (_url, html) => html,
            ssrLoadModule: async () => {
                throw new Error('entry is broken');
            },
            ssrFixStacktrace: () => { fixed = true; },
            environments: createModuleGraph(),
        };

        const render = createViteRender(vite, root);

        await expect(render(event, config, { url: '/logout', data: {} }))
            .rejects.toThrow('entry is broken');

        expect(fixed).toBe(true);
    });

    it('inlines the stylesheets the entry imports, so the markup paints styled before the client runs', async () => {
        const css : FakeModule = {
            id: '/repo/src/tailwind.css', 
            url: '/src/tailwind.css', 
            importedModules: new Set(), 
        };
        const app : FakeModule = {
            id: '/repo/src/app.ts', 
            url: '/src/app.ts', 
            importedModules: new Set([css]), 
        };
        const entry : FakeModule = {
            id: '/repo/src/server.ts', 
            url: '/src/server.ts', 
            importedModules: new Set([app, css]), 
        };
        app.importedModules.add(entry);

        const loaded : string[] = [];

        const vite : ViteRenderContext = {
            transformIndexHtml: async (_url, html) => html,
            ssrLoadModule: async (url) => {
                loaded.push(url);
                if (url === '/src/tailwind.css?inline') {
                    return { default: 'body{color:red}</style>' };
                }

                return { render: async () : Promise<RenderResult> => ['<p>page</p>', ''] };
            },
            ssrFixStacktrace: () => undefined,
            environments: createModuleGraph(entry),
        };

        const render = createViteRender(vite, root);

        const html = await render(event, config, { url: '/logout', data: {} });

        expect(html).toContain('<style type="text/css" data-vite-dev-id="/repo/src/tailwind.css">body{color:red}<\\/style></style>');
        expect(loaded.filter((url) => url.endsWith('?inline'))).toEqual(['/src/tailwind.css?inline']);
    });

    it('keeps the stylesheets in evaluation order and keeps their query', async () => {
        const base : FakeModule = {
            id: '/repo/src/base.css', 
            url: '/src/base.css', 
            importedModules: new Set(), 
        };
        const app : FakeModule = {
            id: '/repo/src/app.ts', 
            url: '/src/app.ts', 
            importedModules: new Set([base]), 
        };
        const overrides : FakeModule = {
            id: '/repo/src/overrides.css?v=2', 
            url: '/src/overrides.css?v=2', 
            importedModules: new Set(), 
        };
        const entry : FakeModule = {
            id: '/repo/src/server.ts', 
            url: '/src/server.ts', 
            importedModules: new Set([app, overrides]), 
        };

        const loaded : string[] = [];

        const vite : ViteRenderContext = {
            transformIndexHtml: async (_url, html) => html,
            ssrLoadModule: async (url) => {
                loaded.push(url);
                if (url.includes('inline')) {
                    return { default: url };
                }

                return { render: async () : Promise<RenderResult> => ['<p>page</p>', ''] };
            },
            ssrFixStacktrace: () => undefined,
            environments: createModuleGraph(entry),
        };

        const html = await createViteRender(vite, root)(event, config, { url: '/logout', data: {} });

        expect(loaded.filter((url) => url.includes('inline'))).toEqual([
            '/src/base.css?inline',
            '/src/overrides.css?v=2&inline',
        ]);
        expect(html.indexOf('data-vite-dev-id="/repo/src/base.css"'))
            .toBeLessThan(html.indexOf('data-vite-dev-id="/repo/src/overrides.css?v=2"'));
    });
});
