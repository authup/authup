/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { StoreAuthStatus, provideStoreFactory } from '@authup/client-web-kit';
import type { RouteLocationNormalized } from 'vue-router';
import { createApp, ref } from 'vue';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type { NuxtApp } from '#app';
import { RoutingInterceptor } from '../../src/runtime/helpers';
import { RouteMetaKey } from '../../src/runtime/constants';

type StoreStub = {
    resolve: ReturnType<typeof vi.fn>,
    logout: ReturnType<typeof vi.fn>,
    exchangeAuthorizationCode: ReturnType<typeof vi.fn>,
    permissionEvaluator: { preEvaluateOneOf: ReturnType<typeof vi.fn> }
};

function createRoute(input: Partial<RouteLocationNormalized> & { path: string }) {
    return {
        query: {},
        hash: '',
        matched: [{ meta: {} }],
        fullPath: input.path,
        ...input,
    } as unknown as RouteLocationNormalized;
}

function createInterceptor(overrides: Partial<StoreStub> = {}) {
    const store = {
        status: ref(StoreAuthStatus.AUTHENTICATED),
        userId: ref('user-1'),
        resolve: vi.fn(async () => {}),
        logout: vi.fn(async () => {}),
        exchangeAuthorizationCode: vi.fn(async () => {}),
        permissionEvaluator: { preEvaluateOneOf: vi.fn(async () => {}) },
        ...overrides,
    };

    const vueApp = createApp({});
    provideStoreFactory((() => store) as never, vueApp);

    const nuxtApp = {
        vueApp,
        $pinia: undefined,
        $config: { public: { authup: {} } },
    } as unknown as NuxtApp;

    return { interceptor: new RoutingInterceptor(nuxtApp), store };
}

// No sessionStorage in this environment, so `loadAuthorizationRequest` returns
// undefined throughout. That is deliberate: the destination is supposed to come
// off the callback URL now, so these cases must pass with no stored request.
describe('RoutingInterceptor', () => {
    describe('post-exchange destination', () => {
        it('should land on the destination carried by the callback query', async () => {
            const { interceptor, store } = createInterceptor();

            const result = await interceptor.execute(
                createRoute({
                    path: '/login/callback',
                    query: {
                        code: 'the-code', 
                        state: 'the-state', 
                        redirect: '/users', 
                    },
                }),
                createRoute({ path: '/' }),
            );

            expect(store.exchangeAuthorizationCode).toHaveBeenCalled();
            expect(result?.path).toEqual('/users');
        });

        it('should carry the destination query and hash', async () => {
            const { interceptor } = createInterceptor();

            const result = await interceptor.execute(
                createRoute({
                    path: '/login/callback',
                    query: { code: 'the-code', redirect: '/users?page=2#row-7' },
                }),
                createRoute({ path: '/' }),
            );

            expect(result?.path).toEqual('/users');
            expect(result?.query).toEqual({ page: '2' });
            expect(result?.hash).toEqual('#row-7');
        });

        // The destination now arrives as URL input rather than from
        // same-origin storage, so a crafted authorize request could put a
        // foreign host in it. Only path/query/hash may survive.
        it.each([
            ['https://evil.test/steal', '/steal'],
            ['//evil.test/steal', '/steal'],
        ])('should discard the host in %s', async (redirect, expected) => {
            const { interceptor } = createInterceptor();

            const result = await interceptor.execute(
                createRoute({
                    path: '/login/callback',
                    query: { code: 'the-code', redirect },
                }),
                createRoute({ path: '/' }),
            );

            expect(result?.path).toEqual(expected);
            expect(JSON.stringify(result)).not.toContain('evil.test');
        });

        it('should strip the oauth2 params when no destination was carried', async () => {
            const { interceptor } = createInterceptor();

            const result = await interceptor.execute(
                createRoute({
                    path: '/login/callback',
                    query: {
                        code: 'the-code', 
                        state: 'the-state', 
                        keep: 'me', 
                    },
                }),
                createRoute({ path: '/' }),
            );

            expect(result?.path).toEqual('/login/callback');
            expect(result?.query).toEqual({ keep: 'me' });
        });

        it('should strip the destination param on a failed exchange', async () => {
            const { interceptor } = createInterceptor({
                exchangeAuthorizationCode: vi.fn(async () => {
                    throw new Error('the code is spent');
                }),
            });

            const result = await interceptor.execute(
                createRoute({
                    path: '/login/callback',
                    query: { code: 'the-code', redirect: '/users' },
                }),
                createRoute({ path: '/' }),
            );

            // Leaving `redirect` on the URL would strand the user on the
            // callback route with a dead param and no way forward.
            expect(result?.query).toEqual({});
        });
    });

    describe('login bounce', () => {
        it('should carry the attempted route as the redirect param', async () => {
            const { interceptor } = createInterceptor({
                resolve: vi.fn(async () => {
                    throw new Error('no session');
                }),
            });

            const result = await interceptor.execute(
                createRoute({ path: '/users', fullPath: '/users?page=2' }),
                createRoute({ path: '/' }),
            );

            expect(result?.path).toEqual('/login');
            expect(result?.query).toEqual({ redirect: '/users?page=2' });
        });
    });

    describe('permission denial', () => {
        const denied = () => createInterceptor({
            permissionEvaluator: {
                preEvaluateOneOf: vi.fn(async () => {
                    throw new Error('denied');
                }),
            },
        });

        const restricted = (path: string) => createRoute({
            path,
            matched: [{ meta: { [RouteMetaKey.REQUIRE_PERMISSIONS]: ['user_read'] } }],
        } as never);

        // The bug this pins: after a login, `from` is the callback route, and
        // bouncing back to it sent the user through a page whose only job is
        // to forward to the home route. They arrived there with no indication
        // that a permission denial was what moved them.
        it('should not bounce back to a route carrying an authorization code', async () => {
            const { interceptor } = denied();

            const result = await interceptor.execute(
                restricted('/users'),
                createRoute({
                    path: '/login/callback',
                    fullPath: '/login/callback?code=the-code&state=the-state',
                    query: { code: 'the-code', state: 'the-state' },
                }),
            );

            expect(result?.path).not.toContain('code');
            expect(result?.path).toEqual('/');
        });

        // The counterpart: a route the user can still go back to is a better
        // landing than the home route, so the code-carrying check above must
        // stay narrow rather than sending every denial home.
        it('should send a denied user back where they came from', async () => {
            const { interceptor } = denied();

            const result = await interceptor.execute(
                restricted('/users'),
                createRoute({ path: '/roles' }),
            );

            expect(result?.path).toEqual('/roles');
        });

        // vue-router parses a fullPath handed to `path` and keeps only the
        // path, so returning `from.fullPath` used to drop whatever list page
        // and anchor the user was looking at.
        it('should keep the query and hash of the route it returns to', async () => {
            const { interceptor } = denied();

            const result = await interceptor.execute(
                restricted('/users'),
                createRoute({
                    path: '/roles',
                    fullPath: '/roles?page=2#row-7',
                    query: { page: '2' },
                    hash: '#row-7',
                }),
            );

            expect(result?.path).toEqual('/roles');
            expect(result?.query).toEqual({ page: '2' });
            expect(result?.hash).toEqual('#row-7');
        });
    });
});
