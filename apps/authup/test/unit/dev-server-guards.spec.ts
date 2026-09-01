/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import net from 'node:net';
import type { IAppEvent } from 'routup';
import { App, defineCoreHandler } from 'routup';
import { serve } from 'routup/node';
import { describe, expect, it } from 'vitest';
import { createConsoleViteServer, createOpenInEditorGuard } from '../../src/dev/index.ts';

/**
 * The guard has to be exercised through a real dispatch rather than by
 * calling the handler: what is being pinned is that a request never REACHES
 * what sits behind it, and only the router can show that.
 */
async function requestThroughGuard(requestPath: string) : Promise<{ status: number, reachedBehind: boolean }> {
    let reachedBehind = false;

    const app = new App();
    app.use(createOpenInEditorGuard());
    app.use(defineCoreHandler({
        method: 'get',
        path: '/*page',
        fn: (event: IAppEvent) => {
            reachedBehind = true;

            return `behind:${event.path}`;
        },
    }));

    const server = serve(app, { port: 0, silent: true });
    await server.ready();

    try {
        const response = await fetch(`${(server.url ?? '').replace(/\/+$/, '')}${requestPath}`);

        return { status: response.status, reachedBehind };
    } finally {
        await server.close(true);
    }
}

describe('createOpenInEditorGuard', () => {
    it('refuses the launch-editor path before anything behind it runs', async () => {
        const result = await requestThroughGuard('/__open-in-editor?file=src/index.ts');

        expect(result.status).toEqual(404);
        expect(result.reachedBehind).toEqual(false);
    });

    it('refuses it under a nested segment as well', async () => {
        const result = await requestThroughGuard('/__open-in-editor/anything');

        expect(result.status).toEqual(404);
        expect(result.reachedBehind).toEqual(false);
    });

    it('lets every other path through', async () => {
        const result = await requestThroughGuard('/users/1');

        expect(result.status).toEqual(200);
        expect(result.reachedBehind).toEqual(true);
    });
});

describe('createConsoleViteServer', () => {
    it('refuses an occupied hot module replacement port by name', async () => {
        // Bound exactly as vite's own ws server binds it (no host, so every
        // interface), which is what the probe has to match.
        const occupied = net.createServer();
        await new Promise<void>((resolve) => {
            occupied.listen(0, () => resolve());
        });

        const address = occupied.address();
        const port = typeof address === 'object' && address ? address.port : 0;

        try {
            await expect(createConsoleViteServer({
                packageName: '@authup/client-admin-console',
                root: process.cwd(),
                basePath: '/console/admin',
                hmrPort: port,
            })).rejects.toThrow(
                new RegExp(`port ${port} for @authup/client-admin-console is already in use`),
            );
        } finally {
            await new Promise<void>((resolve) => {
                occupied.close(() => resolve());
            });
        }
    });
});
