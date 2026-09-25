/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createNoopLogger } from '@authup/server-kit';
import { Container } from 'eldin';
import { describe, expect, it } from 'vitest';
import type { ComponentsHealth, ComponentsModule } from '../../../../../src/app/modules/components';
import { ComponentsInjectionKey, WorkerHealthModule } from '../../../../../src/app/modules/components';
import { ConfigInjectionKey } from '../../../../../src/app/modules/config';
import { normalizeConfig } from '../../../../../src/app/modules/config/read';
import { LoggerInjectionKey } from '../../../../../src/app/modules/logger';

async function serve(health: ComponentsHealth) {
    const container = new Container();
    // 0 inherits into core.worker.port: an ephemeral port
    container.register(ConfigInjectionKey, { useValue: await normalizeConfig({ port: 0, host: '127.0.0.1' }) });
    container.register(LoggerInjectionKey, { useValue: createNoopLogger() });

    container.register(ComponentsInjectionKey, { useValue: { getHealth: () => health } as ComponentsModule });

    const module = new WorkerHealthModule();
    await module.setup(container);

    const address = module.server!.address();

    return {
        baseURL: `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`,
        module,
    };
}

describe('app/modules/components/health', () => {
    it('should answer 503 with the overdue component while unhealthy', async () => {
        const health : ComponentsHealth = {
            healthy: false,
            components: [{
                name: 'oauth2-cleaner', 
                lastSuccessAt: null, 
                runningSince: null, 
                overdue: true, 
            }],
        };

        const { baseURL, module } = await serve(health);

        try {
            const response = await fetch(`${baseURL}/`);
            expect(response.status).toEqual(503);
            expect(await response.json()).toEqual(health);

            expect((await fetch(`${baseURL}/`, { method: 'HEAD' })).status).toEqual(503);
        } finally {
            await module.teardown();
        }
    });

    it('should answer 200 while healthy and 404 for anything else', async () => {
        const { baseURL, module } = await serve({ healthy: true, components: [] });

        try {
            expect((await fetch(`${baseURL}/?probe=1`)).status).toEqual(200);
            expect((await fetch(`${baseURL}/`, { method: 'POST' })).status).toEqual(404);
            expect((await fetch(`${baseURL}/health`)).status).toEqual(404);
        } finally {
            await module.teardown();
        }
    });
});
