/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Store } from '@authup/client-web-kit';
import { StoreAuthStatus } from '@authup/client-web-kit';
import type { RouteLocationNormalized } from 'vue-router';
import { ref } from 'vue';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { LayoutKey } from '../../src/config/layout';
import { createRoutingGuard } from '../../src/guard';

type StoreStub = {
    status: ReturnType<typeof ref<StoreAuthStatus>>,
    userId: ReturnType<typeof ref<string | null>>,
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

function createGuard(
    overrides: Partial<StoreStub> = {},
    options: { cookieSession?: boolean } = {},
) {
    const store : StoreStub = {
        status: ref(StoreAuthStatus.AUTHENTICATED),
        userId: ref('user-1'),
        resolve: vi.fn(async () => {}),
        logout: vi.fn(async () => {}),
        exchangeAuthorizationCode: vi.fn(async () => {}),
        permissionEvaluator: { preEvaluateOneOf: vi.fn(async () => {}) },
        ...overrides,
    };

    const guard = createRoutingGuard({
        store: store as unknown as Store,
        config: { cookieSession: options.cookieSession ?? false },
    });

    return { guard, store };
}

// No sessionStorage in this environment, so the saved authorization request
// and the login-redirect stash both read as absent throughout.
describe('src/guard', () => {
    describe('login bounce', () => {
        it('should carry the attempted route as the redirect param', async () => {
            const { guard } = createGuard({
                resolve: vi.fn(async () => {
                    throw new Error('no session');
                }),
            });

            const result = await guard(
                createRoute({ path: '/users', fullPath: '/users?page=2' }),
                createRoute({ path: '/' }),
            );

            expect(result).toMatchObject({ path: '/login', query: { redirect: '/users?page=2' } });
        });

        it('should bounce a logged-in-only route to the login', async () => {
            const { guard } = createGuard({ status: ref(StoreAuthStatus.UNAUTHENTICATED) });

            const result = await guard(
                createRoute({
                    path: '/users',
                    matched: [{ meta: { [LayoutKey.REQUIRED_LOGGED_IN]: true } }] as never,
                }),
                createRoute({ path: '/' }),
            );

            expect(result).toMatchObject({ path: '/login', query: { redirect: '/users' } });
        });

        it('should let an anonymous visitor open an ungated route', async () => {
            const { guard } = createGuard({ status: ref(StoreAuthStatus.UNAUTHENTICATED) });

            const result = await guard(createRoute({ path: '/logout' }), createRoute({ path: '/' }));

            expect(result).toBeUndefined();
        });
    });

    describe('cookie mode', () => {
        // A plain logout() ends the server-side session, and this fires on
        // ANY failed resolve (a 5xx, a proxy hiccup), none of which is an
        // intent to sign out.
        it('should not revoke the server session on a failed resolve', async () => {
            const { guard, store } = createGuard({
                resolve: vi.fn(async () => {
                    throw new Error('502');
                }),
            }, { cookieSession: true });

            await guard(createRoute({ path: '/users' }), createRoute({ path: '/' }));

            expect(store.logout).toHaveBeenCalledWith({ revoke: false });
        });

        // A settled resolve leaves the session complete or absent; RESTORING
        // is a session this console cannot render (a non-user subject).
        it('should treat a settled RESTORING session as a failed resolve', async () => {
            const { guard, store } = createGuard({ status: ref(StoreAuthStatus.RESTORING) }, { cookieSession: true });

            const result = await guard(
                createRoute({
                    path: '/users',
                    matched: [{ meta: { [LayoutKey.REQUIRED_LOGGED_IN]: true } }] as never,
                }),
                createRoute({ path: '/' }),
            );

            expect(store.logout).toHaveBeenCalledWith({ revoke: false });
            expect(result).toMatchObject({ path: '/login' });
        });

        // The code is redeemed SERVER-side (`GET /admin/callback`), so a
        // `code` on a client route is noise, never a verifier to present.
        it('should never exchange a code', async () => {
            const { guard, store } = createGuard({}, { cookieSession: true });

            await guard(
                createRoute({ path: '/login/callback', query: { code: 'the-code', state: 'x' } }),
                createRoute({ path: '/' }),
            );

            expect(store.exchangeAuthorizationCode).not.toHaveBeenCalled();
        });
    });

    describe('bearer mode', () => {
        it('should exchange a code carried on a client route', async () => {
            const { guard, store } = createGuard();

            const result = await guard(
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

            expect(store.exchangeAuthorizationCode).toHaveBeenCalledWith('the-code');
            expect(result).toMatchObject({ path: '/users' });
        });

        it.each([
            'https://evil.test/steal',
            '//evil.test/steal',
            '/\\evil.test/steal',
            // eslint-disable-next-line no-script-url
            'javascript:alert(1)',
        ])('should ignore the destination %s', async (redirect) => {
            const { guard } = createGuard();

            const result = await guard(
                createRoute({ path: '/login/callback', query: { code: 'the-code', redirect } }),
                createRoute({ path: '/' }),
            );

            expect(result).toMatchObject({ path: '/login/callback', query: {} });
        });
    });

    describe('gates', () => {
        it('should log a logged-in visitor out of a logged-out-only route', async () => {
            const { guard, store } = createGuard();

            const result = await guard(
                createRoute({
                    path: '/login',
                    matched: [{ meta: { [LayoutKey.REQUIRED_LOGGED_OUT]: true } }] as never,
                }),
                createRoute({ path: '/' }),
            );

            expect(store.logout).toHaveBeenCalled();
            expect(result).toBeUndefined();
        });

        it('should send a denied visitor back where they came from', async () => {
            const { guard } = createGuard({
                permissionEvaluator: {
                    preEvaluateOneOf: vi.fn(async () => {
                        throw new Error('denied');
                    }),
                },
            });

            const result = await guard(
                createRoute({
                    path: '/users',
                    matched: [{ meta: { [LayoutKey.REQUIRED_PERMISSIONS]: ['user_read'] } }] as never,
                }),
                createRoute({ path: '/roles', query: { page: '2' } }),
            );

            expect(result).toMatchObject({ path: '/roles', query: { page: '2' } });
        });

        it('should not send a denied visitor back to the callback route', async () => {
            const { guard } = createGuard({
                permissionEvaluator: {
                    preEvaluateOneOf: vi.fn(async () => {
                        throw new Error('denied');
                    }),
                },
            });

            const result = await guard(
                createRoute({
                    path: '/users',
                    matched: [{ meta: { [LayoutKey.REQUIRED_PERMISSIONS]: ['user_read'] } }] as never,
                }),
                createRoute({ path: '/login/callback', query: { code: 'spent' } }),
            );

            expect(result).toMatchObject({ path: '/' });
        });
    });
});
