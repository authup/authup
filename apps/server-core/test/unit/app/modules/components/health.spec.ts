/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createNoopLogger } from '@authup/server-kit';
import { Container } from 'eldin';
import { describe, expect, it } from 'vitest';
import { ApplicationBuilder } from '../../../../../src/app/builder';
import type { ComponentsHealth, ComponentsModule } from '../../../../../src/app/modules/components';
import { ComponentsInjectionKey, WorkerHealthModule } from '../../../../../src/app/modules/components';
import { ConfigModule } from '../../../../../src/app/modules/config';
import { normalizeConfig } from '../../../../../src/app/modules/config/read';
import { LoggerInjectionKey } from '../../../../../src/app/modules/logger';

async function serve(health?: ComponentsHealth) {
    const container = new Container();

    container.register(LoggerInjectionKey, { useValue: createNoopLogger() });

    if (health) {
        container.register(ComponentsInjectionKey, { useValue: { getHealth: () => health } as ComponentsModule });
    }

    const module = new WorkerHealthModule();
    const app = new ApplicationBuilder()
        .withConfig(new ConfigModule(() => normalizeConfig({ port: 0, host: '127.0.0.1' })))
        .withLogger()
        .withHTTP(module)
        .build({ container });

    await app.setup();

    const address = module.server!.address();

    return {
        baseURL: `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`,
        app,
    };
}

describe('app/modules/components/health', () => {
    it('should answer 200 when the components module is absent', async () => {
        const { baseURL, app } = await serve();

        try {
            const response = await fetch(`${baseURL}/`);

            expect(response.status).toEqual(200);
            expect(await response.json()).toEqual({
                healthy: true,
                checks: [{ name: 'components', ok: true }],
                components: [],
            });
            expect((await fetch(`${baseURL}/`, { method: 'HEAD' })).status).toEqual(200);
        } finally {
            await app.teardown();
        }
    });

    it('should answer 503 with the overdue component while unhealthy', async () => {
        const health : ComponentsHealth = {
            healthy: false,
            hung: false,
            components: [{
                name: 'oauth2-cleaner',
                lastSuccessAt: null,
                runningSince: null,
                overdue: true,
                hung: false,
            }],
        };

        const { baseURL, app } = await serve(health);

        try {
            const response = await fetch(`${baseURL}/`);

            expect(response.status).toEqual(503);
            expect(await response.json()).toEqual({
                healthy: false,
                checks: [{ name: 'components', ok: false }],
                components: health.components,
            });

            expect((await fetch(`${baseURL}/`, { method: 'HEAD' })).status).toEqual(503);
        } finally {
            await app.teardown();
        }
    });

    it('should answer 200 while healthy and 404 for anything else', async () => {
        const { baseURL, app } = await serve({
            healthy: true, 
            hung: false, 
            components: [], 
        });

        try {
            expect((await fetch(`${baseURL}/?probe=1`)).status).toEqual(200);
            expect((await fetch(`${baseURL}/`, { method: 'POST' })).status).toEqual(404);
            expect((await fetch(`${baseURL}/health`)).status).toEqual(404);
        } finally {
            await app.teardown();
        }
    });

    it('should answer /readyz like the deprecated root path', async () => {
        const health : ComponentsHealth = {
            healthy: false,
            hung: false,
            components: [{
                name: 'oauth2-cleaner',
                lastSuccessAt: null,
                runningSince: null,
                overdue: true,
                hung: false,
            }],
        };

        const { baseURL, app } = await serve(health);

        try {
            const ready = await fetch(`${baseURL}/readyz`);
            const root = await fetch(`${baseURL}/`);

            expect(ready.status).toEqual(503);
            expect(ready.headers.get('cache-control')).toEqual('no-store');
            expect(await ready.json()).toEqual(await root.json());
            expect((await fetch(`${baseURL}/readyz`, { method: 'HEAD' })).status).toEqual(503);
        } finally {
            await app.teardown();
        }
    });

    it('should keep /livez at 200 for an overdue component, since a restart does not help', async () => {
        const { baseURL, app } = await serve({
            healthy: false,
            hung: false,
            components: [{
                name: 'oauth2-cleaner',
                lastSuccessAt: null,
                runningSince: null,
                overdue: true,
                hung: false,
            }],
        });

        try {
            const response = await fetch(`${baseURL}/livez`);

            expect(response.status).toEqual(200);
            expect(await response.json()).toEqual({
                healthy: true,
                checks: [{ name: 'components', ok: true }],
            });
        } finally {
            await app.teardown();
        }
    });

    it('should fail /livez and /readyz for a hung component', async () => {
        const { baseURL, app } = await serve({
            healthy: false,
            hung: true,
            components: [{
                name: 'oauth2-cleaner',
                lastSuccessAt: null,
                runningSince: '2026-01-01T00:00:00.000Z',
                overdue: true,
                hung: true,
            }],
        });

        try {
            const response = await fetch(`${baseURL}/livez`);

            expect(response.status).toEqual(503);
            expect(await response.json()).toEqual({
                healthy: false,
                checks: [{ name: 'components', ok: false }],
            });
            expect((await fetch(`${baseURL}/livez`, { method: 'HEAD' })).status).toEqual(503);
            expect((await fetch(`${baseURL}/readyz`)).status).toEqual(503);
        } finally {
            await app.teardown();
        }
    });
});
