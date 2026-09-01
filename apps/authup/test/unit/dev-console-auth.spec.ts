/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { HydrationPayload, RenderContext, RenderResult } from '@authup/client-auth-console';
import { resolveConfig } from '@authup/server-auth-console';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { IAppEvent } from 'routup';
import type { ViteDevServer } from 'vite';
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

const config = resolveConfig({ publicUrl: 'http://localhost:3000' });

type ViteRenderContext = Pick<
    ViteDevServer,
'transformIndexHtml' | 'ssrLoadModule' | 'ssrFixStacktrace'
>;

/**
 * The render reads the locale and color-mode cookies through
 * `@routup/basic`, so it needs an event the plugin has seen. One real
 * request supplies one, and both cases then call the render directly.
 */
let event : IAppEvent;

beforeAll(async () => {
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
        };

        const render = createViteRender(vite, root);

        await expect(render(event, config, { url: '/logout', data: {} }))
            .rejects.toThrow('boom');

        expect(fixed).toBe(true);
    });
});
