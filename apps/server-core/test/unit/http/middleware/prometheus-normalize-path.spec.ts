/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { IAppEvent } from 'routup';
import { App, defineCoreHandler } from 'routup';
import { describe, expect, it } from 'vitest';
import { createRouteTemplateNormalizePath } from '../../../../src/adapters/http/middleware/built-in/prometheus.ts';

function createHandler() {
    return defineCoreHandler(() => 'ok');
}

function createRouter(): App {
    const router = new App();

    const users = new App();
    users.get('/', createHandler());
    users.get('/:id', createHandler());
    users.post('/', createHandler());
    users.delete('/:id', createHandler());
    users.post('/:id/authenticators/:deviceId/confirm', createHandler());

    router.use('/users', users);
    router.use('/realms/:realmId/users', users);

    router.post('/token', createHandler());
    router.get('/token/introspect', createHandler());

    router.use('/docs', createHandler());
    router.use(defineCoreHandler((event) => event.next()));

    return router;
}

function createEvent(method: string): IAppEvent {
    return { method } as IAppEvent;
}

describe('http/middleware/prometheus/normalize-path', () => {
    const normalize = createRouteTemplateNormalizePath(createRouter());

    it('should label a parameterized route by its template', () => {
        expect(normalize('/users/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', createEvent('GET')))
            .toEqual('/users/:id');
        expect(normalize('/users/@me', createEvent('GET')))
            .toEqual('/users/:id');
        expect(normalize('/users/foo/authenticators/bar/confirm', createEvent('POST')))
            .toEqual('/users/:id/authenticators/:deviceId/confirm');
    });

    it('should label nested realm mounts by their template', () => {
        expect(normalize('/realms/master/users/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', createEvent('GET')))
            .toEqual('/realms/:realmId/users/:id');
        expect(normalize('/realms/master/users', createEvent('POST')))
            .toEqual('/realms/:realmId/users');
    });

    it('should keep static routes as-is', () => {
        expect(normalize('/users', createEvent('GET'))).toEqual('/users');
        expect(normalize('/token', createEvent('POST'))).toEqual('/token');
        expect(normalize('/token/introspect', createEvent('GET'))).toEqual('/token/introspect');
    });

    it('should ignore trailing slashes', () => {
        expect(normalize('/users/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/', createEvent('GET')))
            .toEqual('/users/:id');
    });

    it('should match HEAD requests against GET routes', () => {
        expect(normalize('/users/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', createEvent('HEAD')))
            .toEqual('/users/:id');
    });

    it('should label a method mismatch by the route shape of the url', () => {
        expect(normalize('/users/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', createEvent('PATCH')))
            .toEqual('/users/:id');
        expect(normalize('/users/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', createEvent('OPTIONS')))
            .toEqual('/users/:id');
    });

    it('should label method-agnostic mounts with a wildcard suffix', () => {
        expect(normalize('/docs/swagger.json', createEvent('GET'))).toEqual('/docs/**');
        expect(normalize('/docs', createEvent('GET'))).toEqual('/docs/**');
    });

    it('should collapse unregistered paths into a single bucket', () => {
        expect(normalize('/no-such-route/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', createEvent('GET')))
            .toEqual('/{unmatched}');
        expect(normalize('/users/foo/bar', createEvent('GET')))
            .toEqual('/{unmatched}');
    });
});
