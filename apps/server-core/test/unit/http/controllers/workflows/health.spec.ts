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
    vi,
} from 'vitest';
import {
    DATABASE_HEALTH_CHECK_TTL,
    DatabaseInjectionKey,
    HTTPInjectionKey,
} from '../../../../../src/index.ts';
import { createTestApplication } from '../../../../app';
import { httpRequest } from '../../../../utils';

describe('src/app/modules/http/health', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should answer /livez with no checks', async () => {
        const response = await httpRequest(suite, 'GET', '/livez');

        expect(response.status).toEqual(200);
        expect(response.headers.get('cache-control')).toEqual('no-store');
        expect(await response.json()).toEqual({ healthy: true, checks: [] });

        expect((await httpRequest(suite, 'HEAD', '/livez')).status).toEqual(200);
    });

    it('should fail /readyz, and only /readyz, while the database does not answer', async () => {
        const dataSource = suite.container.resolve(DatabaseInjectionKey.DataSource);
        const query = vi.spyOn(dataSource, 'query').mockRejectedValue(new Error('connect ECONNREFUSED'));

        try {
            const response = await httpRequest(suite, 'GET', '/readyz');

            expect(response.status).toEqual(503);
            expect(response.headers.get('cache-control')).toEqual('no-store');

            const body = await response.text();

            expect(JSON.parse(body)).toEqual({
                healthy: false,
                checks: [
                    { name: 'database', ok: false },
                    { name: 'shutdown', ok: true },
                ],
            });
            expect(body).not.toContain('ECONNREFUSED');

            expect((await httpRequest(suite, 'HEAD', '/readyz')).status).toEqual(503);
            expect((await httpRequest(suite, 'GET', '/livez')).status).toEqual(200);
        } finally {
            query.mockRestore();
        }

        await new Promise((resolve) => {
            setTimeout(resolve, DATABASE_HEALTH_CHECK_TTL + 100);
        });
    });

    it('should answer /readyz once the database answers', async () => {
        const response = await httpRequest(suite, 'GET', '/readyz');

        expect(response.status).toEqual(200);
        expect(await response.json()).toEqual({
            healthy: true,
            checks: [
                { name: 'database', ok: true },
                { name: 'shutdown', ok: true },
            ],
        });
    });

    it('should answer ahead of the authorization middleware', async () => {
        const response = await httpRequest(suite, 'GET', '/readyz', { headers: { Authorization: 'Bearer not-a-token' } });

        expect(response.status).toEqual(200);
    });

    it('should fail /readyz, and only /readyz, once the process is shutting down', async () => {
        const state = suite.container.resolve(HTTPInjectionKey.ShutdownState);

        state.active = true;

        try {
            const response = await httpRequest(suite, 'GET', '/readyz');

            expect(response.status).toEqual(503);
            expect(await response.json()).toEqual({
                healthy: false,
                checks: [
                    { name: 'database', ok: true },
                    { name: 'shutdown', ok: false },
                ],
            });

            expect((await httpRequest(suite, 'GET', '/livez')).status).toEqual(200);
        } finally {
            state.active = false;
        }
    });
});
