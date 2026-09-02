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
import { HMR_PORT_BASE, createOpenInEditorGuard, resolveHmrPort } from '../../src/dev/index.ts';

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

    it('refuses the uppercase spelling connect would still route to vite', async () => {
        const result = await requestThroughGuard('/__OPEN-IN-EDITOR?file=src/index.ts');

        expect(result.status).toEqual(404);
        expect(result.reachedBehind).toEqual(false);
    });

    it('refuses a mixed-case spelling as well', async () => {
        const result = await requestThroughGuard('/__Open-In-Editor?file=src/index.ts');

        expect(result.status).toEqual(404);
        expect(result.reachedBehind).toEqual(false);
    });

    it('lets every other path through', async () => {
        const result = await requestThroughGuard('/users/1');

        expect(result.status).toEqual(200);
        expect(result.reachedBehind).toEqual(true);
    });
});

describe('resolveHmrPort', () => {
    /**
     * The base is vite's own default HMR port, so on a developer's machine it
     * is the one most likely to be held already by an unrelated vite project.
     * Refusing to start over that would be poor advice, so the port is a
     * preference and the resolver steps past whatever is taken. Occupying
     * whatever it picks first, rather than the literal base, keeps this true
     * no matter what else is running while the suite runs.
     */
    it('steps past a port that is already taken', async () => {
        const first = await resolveHmrPort();

        expect(first).toBeGreaterThanOrEqual(HMR_PORT_BASE);

        // Bound exactly as vite's own ws server binds it (no host, so every
        // interface), or it would not be the same question the resolver asks.
        const occupied = net.createServer();
        await new Promise<void>((resolve) => {
            occupied.listen(first, () => resolve());
        });

        try {
            const second = await resolveHmrPort();

            expect(second).not.toEqual(first);
            expect(second).toBeGreaterThan(HMR_PORT_BASE);
        } finally {
            await new Promise<void>((resolve) => {
                occupied.close(() => resolve());
            });
        }
    });
});
