/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Store } from '@authup/client-web-kit';
import { StoreAuthStatus, saveAuthorizationRequest  } from '@authup/client-web-kit';
import type { RouteLocationNormalized } from 'vue-router';
import { ref } from 'vue';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { LayoutKey } from '../../src/config/layout';
import { createRoutingGuard } from '../../src/guard';
import { LOGIN_REDIRECT_STORAGE_KEY, saveLoginRedirect } from '../../src/redirect';

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

describe('src/guard', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

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

        // The server callback always lands on the console root, so the page
        // the visitor asked for rides a single-use stash written before the
        // kick. Query and hash survive; a second navigation finds nothing.
        it('should land on the stashed destination after the server-side login', async () => {
            const { guard } = createGuard({}, { cookieSession: true });

            saveLoginRedirect('/users?page=2#row-7');

            const result = await guard(createRoute({ path: '/' }), createRoute({ path: '/' }));
            expect(result).toEqual({
                path: '/users', 
                query: { page: '2' }, 
                hash: '#row-7', 
            });

            const again = await guard(createRoute({ path: '/' }), createRoute({ path: '/' }));
            expect(again).toBeUndefined();
        });

        it.each([
            'https://evil.test/steal',
            '//evil.test/steal',
            '/\\evil.test/steal',
        ])('should refuse the stashed destination %s', async (value) => {
            const { guard } = createGuard({}, { cookieSession: true });

            // written raw: the stash is validated on the way OUT as well
            sessionStorage.setItem(LOGIN_REDIRECT_STORAGE_KEY, value);

            const result = await guard(createRoute({ path: '/' }), createRoute({ path: '/' }));
            expect(result).toBeUndefined();
            expect(sessionStorage.getItem(LOGIN_REDIRECT_STORAGE_KEY)).toBeNull();
        });

        it('should drop the stash when the session did not land', async () => {
            const { guard } = createGuard({ status: ref(StoreAuthStatus.UNAUTHENTICATED) }, { cookieSession: true });

            saveLoginRedirect('/users');

            await guard(createRoute({ path: '/login' }), createRoute({ path: '/' }));
            expect(sessionStorage.getItem(LOGIN_REDIRECT_STORAGE_KEY)).toBeNull();
        });
    });

    describe('bearer mode', () => {
        // The console client is public: without the saved verifier the
        // exchange is refused, so the guard must present it together with the
        // request's own client/realm binding.
        it('should exchange a code with the saved PKCE request', async () => {
            const { guard, store } = createGuard();

            saveAuthorizationRequest({
                state: 'the-state',
                code_verifier: 'the-verifier',
                redirect_uri: 'http://console.test/admin/login/callback?redirect=%2Fusers',
                client_id: 'admin-console',
                realm_id: 'realm-1',
            });

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

            expect(store.exchangeAuthorizationCode).toHaveBeenCalledWith('the-code', {
                code_verifier: 'the-verifier',
                redirect_uri: 'http://console.test/admin/login/callback?redirect=%2Fusers',
                client_id: 'admin-console',
                realm_id: 'realm-1',
            });
            expect(result).toMatchObject({ path: '/users' });
        });

        it('should refuse a code whose state does not match the saved request', async () => {
            const { guard, store } = createGuard();

            saveAuthorizationRequest({
                state: 'the-state',
                code_verifier: 'the-verifier',
                redirect_uri: 'http://console.test/admin/login/callback',
                client_id: 'admin-console',
                realm_id: 'realm-1',
            });

            const result = await guard(
                createRoute({ path: '/login/callback', query: { code: 'the-code', state: 'forged' } }),
                createRoute({ path: '/' }),
            );

            expect(store.exchangeAuthorizationCode).not.toHaveBeenCalled();
            // single use either way, and the params are stripped so a reload
            // cannot replay the code
            expect(result).toMatchObject({ path: '/login/callback', query: {} });
        });

        it('should exchange a bare code when no request was saved', async () => {
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

    // The gates never end the session: in cookie mode `logout()` revokes the
    // one auth_sessions row every surface on the origin shares.
    describe('gates', () => {
        it('should send a signed-in visitor on a logged-out-only route home', async () => {
            const { guard, store } = createGuard({}, { cookieSession: true });

            const result = await guard(
                createRoute({
                    path: '/login',
                    matched: [{ meta: { [LayoutKey.REQUIRED_LOGGED_OUT]: true } }] as never,
                }),
                createRoute({ path: '/users' }),
            );

            expect(store.logout).not.toHaveBeenCalled();
            expect(result).toEqual({ path: '/' });
        });

        it('should send a denied visitor back where they came from', async () => {
            const { guard, store } = createGuard({
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

            expect(store.logout).not.toHaveBeenCalled();
            expect(result).toMatchObject({ path: '/roles', query: { page: '2' } });
        });

        // Denied the route they are already on, or arriving from the login
        // page: `backTo` would bounce straight back into the denial.
        it.each([
            createRoute({ path: '/users' }),
            createRoute({
                path: '/login',
                matched: [{ meta: { [LayoutKey.REQUIRED_LOGGED_OUT]: true } }] as never,
            }),
        ])('should send a denied visitor home instead of looping (from %s)', async (from) => {
            const { guard, store } = createGuard({
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
                from,
            );

            expect(store.logout).not.toHaveBeenCalled();
            expect(result).toEqual({ path: '/' });
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
