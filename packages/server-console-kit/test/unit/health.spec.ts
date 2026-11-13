/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Application } from 'orkos';
import type { IApp } from 'routup';
import { App } from 'routup';
import { describe, expect, it } from 'vitest';
import {
    InjectionKey,
    buildShutdownOptions,
    markShuttingDown,
    mountHealthRoutes,
} from '../../src';
import type { Config } from '../../src';

function createApp() : IApp {
    const app = new App();

    mountHealthRoutes(app);

    return app;
}

async function read(app: IApp, path: string) {
    const response = await app.fetch(new Request(`http://localhost${path}`));

    return { status: response.status, body: await response.json() };
}

function createApplication(app: IApp, shutdownDelay?: number) : Application {
    const application = new Application({ modules: [] });

    application.container.register(InjectionKey.App, { useValue: app });
    application.container.register(InjectionKey.Config, { useValue: { shutdownDelay } as Config });

    return application;
}

describe('health', () => {
    it('should answer both paths while serving', async () => {
        const app = createApp();

        expect(await read(app, '/livez')).toEqual({ status: 200, body: { healthy: true, checks: [] } });
        expect(await read(app, '/readyz')).toEqual({
            status: 200,
            body: { healthy: true, checks: [{ name: 'shutdown', ok: true }] },
        });
    });

    it('should fail /readyz, and only /readyz, once marked as shutting down', async () => {
        const app = createApp();

        markShuttingDown(app);

        expect(await read(app, '/readyz')).toEqual({
            status: 503,
            body: { healthy: false, checks: [{ name: 'shutdown', ok: false }] },
        });
        expect((await read(app, '/livez')).status).toEqual(200);
    });

    it('should keep the state per app', async () => {
        const first = createApp();
        const second = createApp();

        markShuttingDown(first);

        expect((await read(first, '/readyz')).status).toEqual(503);
        expect((await read(second, '/readyz')).status).toEqual(200);
    });

    it('should ignore an app without the health routes', () => {
        expect(() => markShuttingDown(new App())).not.toThrow();
    });

    it('should drain every application and wait for the longest delay', async () => {
        const first = createApp();
        const second = createApp();

        const options = buildShutdownOptions([
            createApplication(first, 2),
            createApplication(second, 5),
        ]);

        expect(options.delay).toEqual(5_000);

        options.onSignal();

        expect((await read(first, '/readyz')).status).toEqual(503);
        expect((await read(second, '/readyz')).status).toEqual(503);
    });

    it('should not wait when no delay is configured', () => {
        expect(buildShutdownOptions([createApplication(createApp())]).delay).toEqual(0);
        expect(buildShutdownOptions([]).delay).toEqual(0);
    });
});
