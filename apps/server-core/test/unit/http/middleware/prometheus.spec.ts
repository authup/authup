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
import { httpRequest } from '../../../utils';
import { createTestApplication } from '../../../app';

describe('http/middleware/prometheus', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.middlewarePrometheus = true;
        },
    });

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should meter the token and authorize endpoints', async () => {
        await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'password',
                username: 'not-a-user',
                password: 'not-a-password',
            },
        });
        await httpRequest(suite, 'GET', '/authorize');

        const response = await httpRequest(suite, 'GET', '/metrics');
        expect(response.status).toEqual(200);

        const body = await response.text();
        expect(body).toContain('path="/token"');
        expect(body).toContain('path="/authorize"');
    });

    it('should not meter the metrics self-scrape or the root status endpoint', async () => {
        await httpRequest(suite, 'GET', '/');
        await httpRequest(suite, 'GET', '/metrics');

        const response = await httpRequest(suite, 'GET', '/metrics');
        const body = await response.text();
        expect(body).not.toContain('path="/metrics"');
        expect(body).not.toContain('path="/"');
    });
});
