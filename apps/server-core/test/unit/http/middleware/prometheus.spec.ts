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

    it('should label parameterized routes by their route template', async () => {
        const idOne = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
        const idTwo = '1c9e5c8e-0f2a-4b8e-9d3e-5a1b2c3d4e5f';

        await httpRequest(suite, 'GET', `/users/${idOne}`);
        await httpRequest(suite, 'GET', `/users/${idTwo}`);
        await httpRequest(suite, 'GET', `/realms/master/users/${idOne}`);

        const response = await httpRequest(suite, 'GET', '/metrics');
        expect(response.status).toEqual(200);

        const body = await response.text();
        expect(body).toContain('path="/users/:id"');
        expect(body).toContain('path="/realms/:realmId/users/:id"');
        expect(body).not.toContain(idOne);
        expect(body).not.toContain(idTwo);
    });

    it('should collapse unregistered paths into a single unmatched bucket', async () => {
        await httpRequest(suite, 'GET', '/no-such-route/e5f6a7b8-c9d0-1234-5678-90abcdef1234');

        const response = await httpRequest(suite, 'GET', '/metrics');
        const body = await response.text();
        expect(body).toContain('path="/{unmatched}"');
        expect(body).not.toContain('no-such-route');
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
