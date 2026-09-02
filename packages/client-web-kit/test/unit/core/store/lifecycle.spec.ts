/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeClient, FakeHandler, FakeRequest } from '@authup/core-http-kit/testing';
import { describe, expect, it } from 'vitest';
import { StoreDispatcherEventName, createStore, createStoreDispatcher } from '../../../../src/core/store';

const GRANT_RESPONSE = {
    access_token: 'at-1',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'rt-1',
    id_token: 'idt-1',
};

const INTROSPECTION_RESPONSE = {
    active: true,
    exp: 9999999999,
    // the endpoint resolves the subject and answers with its OpenID claims —
    // the store builds `user` out of these
    sub: 'user-1',
    sub_kind: 'user',
    name: 'admin',
    session_id: 'sess-1',
    realm_id: 'realm-1',
    realm_name: 'master',
    permissions: [],
};

const USER_RESPONSE = { id: 'user-1', name: 'admin' };

const LIFECYCLE_EVENTS : string[] = [
    StoreDispatcherEventName.LOGGING_IN,
    StoreDispatcherEventName.LOGGED_IN,
    StoreDispatcherEventName.LOGGING_OUT,
    StoreDispatcherEventName.LOGGED_OUT,
    StoreDispatcherEventName.SESSION_EXPIRED,
    StoreDispatcherEventName.RESOLVING,
    StoreDispatcherEventName.RESOLVED,
];

function buildStore(handlers: Record<string, FakeHandler> = {}) {
    const httpClient = createFakeClient({
        handlers: {
            'POST /token': () => ({ ...GRANT_RESPONSE }),
            'POST /token/introspect': () => ({ ...INTROSPECTION_RESPONSE }),
            'GET /userinfo': () => ({ ...USER_RESPONSE }),
            'POST /token/revoke': () => ({}),
            ...handlers,
        },
    });

    const dispatcher = createStoreDispatcher();
    const store = createStore({ httpClient, dispatcher });

    const events : string[] = [];
    dispatcher.on('*', (...args) => {
        events.push(args[0]);
    });

    return {
        store, 
        httpClient, 
        dispatcher, 
        events,
    };
}

function pathname(request: FakeRequest) : string {
    return new URL(request.url, 'http://localhost').pathname;
}

function requestsTo(httpClient: FakeClient, method: string, path: string) : FakeRequest[] {
    return httpClient.requests.filter(
        (request) => request.method === method && pathname(request) === path,
    );
}

describe('core/store/lifecycle', () => {
    it('emits the documented event order on login and never REALM_UPDATED', async () => {
        const { store, events } = buildStore();

        await store.login({ name: 'admin', password: 'start123' });

        expect(events).toEqual([
            StoreDispatcherEventName.LOGGING_IN,
            // login() clears any previous identity's state between the grant
            // succeeding and applying the response (plan 047.3 — a retained
            // id_token must not survive onto a new identity): cleanup()
            // unsets every stateful ref.
            StoreDispatcherEventName.ACCESS_TOKEN_UPDATED,
            StoreDispatcherEventName.ACCESS_TOKEN_EXPIRE_DATE_UPDATED,
            StoreDispatcherEventName.REFRESH_TOKEN_UPDATED,
            StoreDispatcherEventName.ID_TOKEN_UPDATED,
            StoreDispatcherEventName.USER_UPDATED,
            StoreDispatcherEventName.REALM_UPDATED,
            StoreDispatcherEventName.REALM_MANAGEMENT_UPDATED,
            // applyTokenGrantResponse: expire date is set BEFORE the token
            // (the cookie maxAge computation depends on that ordering)
            StoreDispatcherEventName.ACCESS_TOKEN_EXPIRE_DATE_UPDATED,
            StoreDispatcherEventName.ACCESS_TOKEN_UPDATED,
            StoreDispatcherEventName.REFRESH_TOKEN_UPDATED,
            StoreDispatcherEventName.ID_TOKEN_UPDATED,
            // introspection exp overwrites the grant-derived expire date
            StoreDispatcherEventName.ACCESS_TOKEN_EXPIRE_DATE_UPDATED,
            StoreDispatcherEventName.REALM_MANAGEMENT_UPDATED,
            StoreDispatcherEventName.USER_UPDATED,
            StoreDispatcherEventName.LOGGED_IN,
        ]);

        // introspection writes realm.value directly, bypassing setRealm —
        // REALM_UPDATED only ever fires as the cleanup unset, never with a
        // non-null value
        expect(
            events.filter((event) => event === StoreDispatcherEventName.REALM_UPDATED),
        ).toHaveLength(1);
        expect(store.realmId.value).toEqual('realm-1');
    });

    it('leaves LOGGING_IN dangling when the password grant fails', async () => {
        const { store, events } = buildStore({
            'POST /token': () => {
                throw new Error('grant failed');
            },
        });

        await expect(store.login({ name: 'admin', password: 'wrong' })).rejects.toThrow();

        expect(events).toEqual([StoreDispatcherEventName.LOGGING_IN]);
        expect(store.accessToken.value).toBeNull();
        expect(store.loggedIn.value).toBe(false);
    });

    // Deliberately flipped by the plan-045 atomic commit: previously the token
    // was applied before resolution, leaving a half-built token-only session
    // whose realm never resolved (the optimistic tokenResolved latch).
    it('reverts a login whose introspection failed: nothing committed, staged tokens revoked', async () => {
        let introspectCalls = 0;
        const {
            store, 
            httpClient, 
            events, 
        } = buildStore({
            'POST /token/introspect': () => {
                introspectCalls += 1;
                if (introspectCalls === 1) {
                    throw new Error('introspection down');
                }

                return { ...INTROSPECTION_RESPONSE };
            },
        });

        await expect(store.login({ name: 'admin', password: 'start123' })).rejects.toThrow();

        expect(store.loggedIn.value).toBe(false);
        expect(store.accessToken.value).toBeNull();
        expect(events).not.toContain(StoreDispatcherEventName.LOGGED_IN);

        // the granted-but-never-committed tokens were revoked best-effort —
        // otherwise the server session would be orphaned (unreachable by any
        // later logout)
        const revokeRequests = requestsTo(httpClient, 'POST', '/token/revoke');
        expect(revokeRequests).toHaveLength(2);
        expect(revokeRequests[0].body).toMatchObject({ token: 'at-1' });
        expect(revokeRequests[1].body).toMatchObject({ token: 'rt-1' });

        // no latch: a retry runs introspection again and fully recovers
        await store.login({ name: 'admin', password: 'start123' });

        expect(introspectCalls).toEqual(2);
        expect(store.realmId.value).toEqual('realm-1');
        expect(store.user.value).toMatchObject({ id: 'user-1' });
    });

    // Same revert, reached the other way: the introspection SUCCEEDS and reports
    // the freshly granted token as one the server will not honour.
    it('reverts a login whose grant introspects inactive', async () => {
        const {
            store, 
            httpClient, 
            events, 
        } = buildStore({ 'POST /token/introspect': () => ({ ...INTROSPECTION_RESPONSE, active: false }) });

        await expect(store.login({ name: 'admin', password: 'start123' })).rejects.toThrow();

        expect(store.loggedIn.value).toBe(false);
        expect(store.accessToken.value).toBeNull();
        expect(store.user.value).toBeNull();
        expect(events).not.toContain(StoreDispatcherEventName.LOGGED_IN);

        const revokeRequests = requestsTo(httpClient, 'POST', '/token/revoke');
        expect(revokeRequests).toHaveLength(2);
    });

    it('logout is local-only: revokes both tokens, never touches the sessions API', async () => {
        const {
            store, 
            httpClient, 
            events, 
        } = buildStore();

        await store.login({ name: 'admin', password: 'start123' });
        events.length = 0;
        const requestCount = httpClient.requests.length;

        await store.logout();

        expect(events).toEqual([
            StoreDispatcherEventName.LOGGING_OUT,
            StoreDispatcherEventName.ACCESS_TOKEN_UPDATED,
            StoreDispatcherEventName.ACCESS_TOKEN_EXPIRE_DATE_UPDATED,
            StoreDispatcherEventName.REFRESH_TOKEN_UPDATED,
            StoreDispatcherEventName.ID_TOKEN_UPDATED,
            StoreDispatcherEventName.USER_UPDATED,
            StoreDispatcherEventName.REALM_UPDATED,
            StoreDispatcherEventName.REALM_MANAGEMENT_UPDATED,
            StoreDispatcherEventName.LOGGED_OUT,
        ]);

        const logoutRequests = httpClient.requests.slice(requestCount);
        expect(logoutRequests).toHaveLength(2);
        expect(logoutRequests.map((request) => pathname(request))).toEqual([
            '/token/revoke',
            '/token/revoke',
        ]);
        expect(logoutRequests[0].body).toMatchObject({ token: 'at-1' });
        expect(logoutRequests[1].body).toMatchObject({ token: 'rt-1' });

        expect(httpClient.requests.some(
            (request) => pathname(request).startsWith('/sessions'),
        )).toBe(false);
    });

    it('swallows revoke failures on logout', async () => {
        const { store } = buildStore({
            'POST /token/revoke': () => {
                throw new Error('revoke down');
            },
        });

        await store.login({ name: 'admin', password: 'start123' });
        await store.logout();

        expect(store.accessToken.value).toBeNull();
        expect(store.user.value).toBeNull();
    });

    it('rejects and cleans up when the refresh grant fails: no RESOLVED', async () => {
        const {
            store, 
            httpClient, 
            events, 
        } = buildStore({
            'POST /token': () => {
                throw new Error('invalid_grant');
            },
        });

        store.setRefreshToken('rt-1');
        events.length = 0;

        await expect(store.resolve()).rejects.toThrow();

        expect(events).toContain(StoreDispatcherEventName.RESOLVING);
        expect(events).not.toContain(StoreDispatcherEventName.RESOLVED);
        expect(store.refreshToken.value).toBeNull();

        const tokenRequests = requestsTo(httpClient, 'POST', '/token');
        expect(tokenRequests).toHaveLength(1);
        expect(tokenRequests[0].body).toMatchObject({ grant_type: 'refresh_token' });

        // cleanup captured the refresh token before nulling and revoked it
        const revokeRequests = requestsTo(httpClient, 'POST', '/token/revoke');
        expect(revokeRequests).toHaveLength(1);
        expect(revokeRequests[0].body).toMatchObject({ token: 'rt-1' });
    });

    it('recovers via the refresh retry branch when introspection fails once', async () => {
        let introspectCalls = 0;
        const {
            store, 
            httpClient, 
            events, 
        } = buildStore({
            'POST /token': (request) => {
                expect((request.body as Record<string, string>).grant_type).toEqual('refresh_token');

                return {
                    access_token: 'at-2',
                    token_type: 'Bearer',
                    expires_in: 3600,
                    refresh_token: 'rt-2',
                };
            },
            'POST /token/introspect': () => {
                introspectCalls += 1;
                if (introspectCalls === 1) {
                    throw new Error('introspection down');
                }

                return { ...INTROSPECTION_RESPONSE };
            },
        });

        store.setAccessToken('at-0');
        store.setRefreshToken('rt-0');
        events.length = 0;

        await store.resolve();

        expect(introspectCalls).toEqual(2);
        expect(store.accessToken.value).toEqual('at-2');
        expect(store.refreshToken.value).toEqual('rt-2');
        expect(store.realmId.value).toEqual('realm-1');
        expect(store.user.value).toMatchObject({ id: 'user-1' });
        expect(events.at(-1)).toEqual(StoreDispatcherEventName.RESOLVED);
        expect(requestsTo(httpClient, 'POST', '/token')).toHaveLength(1);
    });

    it('emits RESOLVING and RESOLVED even with no session at all', async () => {
        const {
            store, 
            httpClient, 
            events, 
        } = buildStore();

        await store.resolve();

        expect(events).toEqual([
            StoreDispatcherEventName.RESOLVING,
            StoreDispatcherEventName.RESOLVED,
        ]);
        expect(httpClient.requests).toHaveLength(0);
    });

    it('exchangeAuthorizationCode wipes the previous identity on success and emits no lifecycle events', async () => {
        const {
            store, 
            httpClient, 
            events, 
        } = buildStore();

        store.setAccessToken('old-at');
        store.setRefreshToken('old-rt');
        events.length = 0;

        await store.exchangeAuthorizationCode('code-1', {
            code_verifier: 'verifier-1',
            redirect_uri: 'https://rp.example/callback',
            client_id: 'client-1',
            realm_id: 'realm-1',
        });

        const tokenRequests = requestsTo(httpClient, 'POST', '/token');
        expect(tokenRequests).toHaveLength(1);
        expect(tokenRequests[0].body).toMatchObject({
            grant_type: 'authorization_code',
            code: 'code-1',
            code_verifier: 'verifier-1',
            redirect_uri: 'https://rp.example/callback',
            client_id: 'client-1',
            realm_id: 'realm-1',
        });

        // cleanup on the SUCCESS path revokes the previous tokens
        const revokeRequests = requestsTo(httpClient, 'POST', '/token/revoke');
        expect(revokeRequests).toHaveLength(2);
        expect(revokeRequests[0].body).toMatchObject({ token: 'old-at' });
        expect(revokeRequests[1].body).toMatchObject({ token: 'old-rt' });

        expect(store.accessToken.value).toEqual('at-1');
        expect(store.idToken.value).toEqual('idt-1');
        expect(store.user.value).toMatchObject({ id: 'user-1' });

        expect(events.filter((event) => LIFECYCLE_EVENTS.includes(event))).toHaveLength(0);
    });

    it('leaves prior state intact when the code exchange fails', async () => {
        const { store, httpClient } = buildStore({
            'POST /token': () => {
                throw new Error('invalid_grant');
            },
        });

        store.setAccessToken('old-at');
        store.setRefreshToken('old-rt');

        await expect(store.exchangeAuthorizationCode('code-1')).rejects.toThrow();

        expect(store.accessToken.value).toEqual('old-at');
        expect(store.refreshToken.value).toEqual('old-rt');
        expect(requestsTo(httpClient, 'POST', '/token/revoke')).toHaveLength(0);
    });

    it('retains the id_token across a refresh-grant resolve()', async () => {
        const { store } = buildStore({
            'POST /token': () => ({
                access_token: 'at-2',
                token_type: 'Bearer',
                expires_in: 3600,
                refresh_token: 'rt-2',
            }),
        });

        store.setRefreshToken('rt-1');
        store.setIdToken('previous-id-token');

        await store.resolve();

        expect(store.accessToken.value).toEqual('at-2');
        expect(store.idToken.value).toEqual('previous-id-token');
    });

    it('populates sessionId through the login path', async () => {
        const { store } = buildStore();

        await store.login({ name: 'admin', password: 'start123' });

        expect(store.sessionId.value).toEqual('sess-1');
    });

    it('shares one in-flight resolution across concurrent resolve() calls', async () => {
        const { store, httpClient } = buildStore();

        store.setAccessToken('at-1');

        await Promise.all([store.resolve(), store.resolve()]);

        expect(requestsTo(httpClient, 'POST', '/token/introspect')).toHaveLength(1);

        // the subject rides the introspection response — the store never calls
        // the userinfo endpoint
        expect(requestsTo(httpClient, 'GET', '/userinfo')).toHaveLength(0);
    });

    it('stages the login: no token or user is observable before the commit', async () => {
        const observed : unknown[] = [];
        const { store } = buildStore({
            'POST /token/introspect': () => {
                observed.push(
                    store.accessToken.value,
                    store.loggedIn.value,
                    store.user.value,
                );

                return { ...INTROSPECTION_RESPONSE };
            },
        });

        await store.login({ name: 'admin', password: 'start123' });

        // the staged round-trip ran against an untouched store
        expect(observed).toEqual([null, false, null]);
        expect(store.accessToken.value).toEqual('at-1');
        expect(store.user.value).toMatchObject({ id: 'user-1' });
    });

    it('aborts the commit when a logout interleaves with the staged login window', async () => {
        const {
            store, 
            httpClient, 
            events, 
        } = buildStore({
            'POST /token/introspect': async () => {
                await store.logout();

                return { ...INTROSPECTION_RESPONSE };
            },
        });

        await expect(store.login({ name: 'admin', password: 'start123' })).rejects.toThrow();

        // the logout wins: nothing resurrected, staged tokens revoked
        expect(store.accessToken.value).toBeNull();
        expect(store.user.value).toBeNull();
        expect(events).not.toContain(StoreDispatcherEventName.LOGGED_IN);

        const revokeRequests = requestsTo(httpClient, 'POST', '/token/revoke');
        expect(revokeRequests).toHaveLength(2);
        expect(revokeRequests[0].body).toMatchObject({ token: 'at-1' });
        expect(revokeRequests[1].body).toMatchObject({ token: 'rt-1' });
    });

    it('keeps a logout final when it interleaves with the store refresh round-trip', async () => {
        const { promise: gate, resolve: release } = Promise.withResolvers<void>();

        const { store, httpClient } = buildStore({
            'POST /token': async () => {
                await gate;

                return {
                    access_token: 'at-late',
                    token_type: 'Bearer',
                    expires_in: 3600,
                    refresh_token: 'rt-late',
                };
            },
        });

        // RT-only hydration (access-token cookie expired via maxAge, the
        // refresh-token session cookie survived) — resolve() starts a refresh
        store.setRefreshToken('rt-0');

        const resolving = store.resolve();

        await store.logout();
        release();

        await expect(resolving).rejects.toThrow(
            'The session was torn down before the token could be refreshed.',
        );

        // the logout wins: the late grant is dropped, never written, revoked
        expect(store.accessToken.value).toBeNull();
        expect(store.refreshToken.value).toBeNull();
        expect(store.lastAuthOrigin.value).toBeNull();

        const revoked = requestsTo(httpClient, 'POST', '/token/revoke')
            .map((request) => (request.body as Record<string, string>).token);
        expect(revoked).toContain('at-late');
        expect(revoked).toContain('rt-late');
    });

    it('revalidates on the next resolve() after a bare token apply (refresh path)', async () => {
        // the resolve() promise-share dedup clears one macrotask after settle
        // (pinned above) — step past it between the consecutive resolve()s
        const nextMacroTask = () => new Promise((resolve) => {
            setTimeout(resolve, 0);
        });

        const { store, httpClient } = buildStore();

        await store.login({ name: 'admin', password: 'start123' });
        expect(requestsTo(httpClient, 'POST', '/token/introspect')).toHaveLength(1);

        // a settled session resolves as a no-op
        await store.resolve();
        await nextMacroTask();
        expect(requestsTo(httpClient, 'POST', '/token/introspect')).toHaveLength(1);

        // the auth hook's REFRESH_FINISHED path applies a bare refresh grant —
        // identity data is now stale, the next resolve() re-introspects with
        // the fresh token (awaited)
        store.applyTokenGrantResponse({
            access_token: 'at-2',
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: 'rt-2',
        });

        await store.resolve();

        const introspections = requestsTo(httpClient, 'POST', '/token/introspect');
        expect(introspections).toHaveLength(2);
        expect(introspections[1].body).toMatchObject({ token: 'at-2' });
    });
});
