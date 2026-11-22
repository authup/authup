/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { Registry } from 'prom-client';
import { App, defineCoreHandler } from 'routup';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { registerPrometheusMiddleware } from '../../../../src/adapters/http/middleware/built-in/prometheus.ts';

const ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

function createHandler() {
    return defineCoreHandler(() => 'ok');
}

function createRouter(registry: Registry): App {
    const router = new App();

    // installed first, like the middleware module does
    registerPrometheusMiddleware(router, { registry, uptime: false });

    const users = new App();

    users.get('/', createHandler());
    users.get('/:id', createHandler());
    users.post('/', createHandler());
    users.post('/:id/authenticators/:deviceId/confirm', createHandler());

    router.use('/users', users);
    router.use('/realms/:realmId/users', users);

    router.post('/token', createHandler());

    router.use('/docs', createHandler());
    router.use('/console/admin', createHandler());

    return router;
}

describe('http/middleware/prometheus/path-label', () => {
    let registry : Registry;
    let router : App;

    beforeEach(() => {
        registry = new Registry();
        router = createRouter(registry);
    });

    async function request(method: string, path: string) {
        await router.fetch(new Request(`http://localhost${path}`, { method }));
    }

    async function readPathLabels() : Promise<string[]> {
        const metrics = await registry.getMetricsAsJSON();
        const labels = new Set<string>();

        for (const metric of metrics) {
            for (const value of (metric as { values?: { labels: Record<string, unknown> }[] }).values || []) {
                if (typeof value.labels.path === 'string') {
                    labels.add(value.labels.path);
                }
            }
        }

        return [...labels].sort();
    }

    it('should label a request by the pattern of its route', async () => {
        await request('GET', `/users/${ID}`);
        await request('GET', '/users/@me');
        await request('POST', '/users/foo/authenticators/bar/confirm');
        await request('GET', `/realms/master/users/${ID}`);
        await request('POST', '/token');

        expect(await readPathLabels()).toEqual([
            '/realms/:realmId/users/:id',
            '/token',
            '/users/:id',
            '/users/:id/authenticators/:deviceId/confirm',
        ]);
    });

    it('should label a HEAD request by its GET route', async () => {
        await request('HEAD', `/users/${ID}`);

        expect(await readPathLabels()).toEqual(['/users/:id']);
    });

    it('should collapse unrouted requests into one bucket', async () => {
        await request('GET', `/no-such-route/${ID}`);
        await request('GET', '/users/foo/bar');
        await request('PATCH', `/users/${ID}`);

        expect(await readPathLabels()).toEqual(['/{unmatched}']);
    });

    it('should label a request a method-less mount answers by its mount', async () => {
        await request('GET', '/docs');
        await request('GET', '/docs/swagger-ui.css');
        await request('GET', '/console/admin/users/abc');
        await request('GET', '/documents');

        expect(await readPathLabels()).toEqual([
            '/console/admin/**',
            '/docs/**',
            '/{unmatched}',
        ]);
    });
});
