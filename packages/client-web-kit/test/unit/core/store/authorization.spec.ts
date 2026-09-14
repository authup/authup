/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthorizationCatalogStaleError, BuiltInPolicyType, PolicyData } from '@authup/access';
import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeClient, FakeHandlerMap, FakeRequest } from '@authup/core-http-kit/testing';
import { describe, expect, it } from 'vitest';
import { StoreAuthStatus, createStore, createStoreDispatcher } from '../../../../src/core/store';
import {
    AUTHORIZATION_REALM,
    AUTHORIZATION_SUBJECT,
    buildAuthorizationCatalog,
    buildAuthorizationGrants,
} from '../../../utils/authorization';

const INTROSPECTION = {
    active: true,
    exp: 9999999999,
    sub: AUTHORIZATION_SUBJECT,
    sub_kind: 'user',
    name: 'admin',
    session_id: 'sess-1',
    realm_id: AUTHORIZATION_REALM,
    realm_name: 'master',
    scope: 'global openid',
    permissions: buildAuthorizationGrants(),
};

const GRANT_RESPONSE = {
    access_token: 'xyz',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'abc',
};

function createResponseError(status: number, message: string) {
    return Object.assign(new Error(message), { response: { status, data: { message } } });
}

function buildStore(handlers: FakeHandlerMap = {}, cookieSession = false) {
    const httpClient = createFakeClient({
        handlers: {
            'POST /token': () => ({ ...GRANT_RESPONSE }),
            'POST /token/introspect': () => ({ ...INTROSPECTION }),
            'GET /sessions/@me/introspect': () => ({ ...INTROSPECTION }),
            'GET /authorization': () => buildAuthorizationCatalog(),
            'POST /token/revoke': () => ({}),
            ...handlers,
        },
    });
    const store = createStore({
        httpClient,
        dispatcher: createStoreDispatcher(),
        cookieSession,
    });

    return { store, httpClient };
}

function realm(realmId: string | null) {
    return new PolicyData({ [BuiltInPolicyType.REALM_MATCH]: realmId });
}

function findRequests(httpClient: FakeClient, pathname: string) : FakeRequest[] {
    return httpClient.requests.filter(
        (request) => new URL(request.url, 'http://localhost').pathname === pathname,
    );
}

/**
 * The fixture's grants with a junction policy the default catalog lacks: a
 * junction row created after the catalog was cached, the one stale case.
 * `buildLaterCatalog` is the catalog fetched after that row exists.
 */
const LATER_GRANTS = buildAuthorizationGrants().map((grant) => ({ ...grant, policies: ['later'] }));

function buildLaterCatalog() {
    const catalog = buildAuthorizationCatalog();

    return {
        ...catalog,
        policies: {
            ...catalog.policies,
            later: { type: 'date', start: '2000-01-01' },
        },
    };
}

describe('core/store (authorization catalog)', () => {
    it('fetches the catalog once with the staged bearer and gates by realm reach', async () => {
        const { store, httpClient } = buildStore();
        const evaluator = store.permissionEvaluator;

        await store.login({ name: 'admin', password: 'start123' });

        const requests = findRequests(httpClient, '/authorization');
        expect(requests).toHaveLength(1);
        expect(requests[0].headers.authorization).toEqual('Bearer xyz');
        expect(store.permissionEvaluator).toBe(evaluator);

        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).resolves.toBeUndefined();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm(AUTHORIZATION_REALM) })).resolves.toBeUndefined();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm('realm-2') })).rejects.toThrow();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_write' })).rejects.toThrow();
    });

    it('reads the catalog once per store instance across a login and a revalidation', async () => {
        const { store, httpClient } = buildStore();

        await store.login({ name: 'admin', password: 'start123' });

        // a refresh grant marks the resolution stale, so the next resolve()
        // introspects again and rebuilds the evaluator
        store.applyTokenGrantResponse({ ...GRANT_RESPONSE, access_token: 'xyz-2' });
        await store.resolve();

        expect(findRequests(httpClient, '/token/introspect')).toHaveLength(2);
        expect(findRequests(httpClient, '/authorization')).toHaveLength(1);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm(AUTHORIZATION_REALM) })).resolves.toBeUndefined();
    });

    it('refetches a catalog the grants outrun once and builds from the second answer', async () => {
        let calls = 0;
        const { store, httpClient } = buildStore({
            'POST /token/introspect': () => ({ ...INTROSPECTION, permissions: LATER_GRANTS }),
            'GET /authorization': () => {
                calls += 1;

                return calls === 1 ? buildAuthorizationCatalog() : buildLaterCatalog();
            },
        });

        await store.login({ name: 'admin', password: 'start123' });

        expect(findRequests(httpClient, '/authorization')).toHaveLength(2);
        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm(AUTHORIZATION_REALM) })).resolves.toBeUndefined();
    });

    it('refetches a catalog that predates the granted definition and builds from the second answer', async () => {
        // the grants come from a fresh introspection: a definition created
        // after the catalog was cached is a stale copy, never a deny
        let calls = 0;
        const { store, httpClient } = buildStore({
            'GET /authorization': () => {
                calls += 1;

                return calls === 1 ? buildAuthorizationCatalog({ permissions: [] }) : buildAuthorizationCatalog();
            },
        });

        await store.login({ name: 'admin', password: 'start123' });

        expect(findRequests(httpClient, '/authorization')).toHaveLength(2);
        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm(AUTHORIZATION_REALM) })).resolves.toBeUndefined();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm('realm-2') })).rejects.toThrow();
    });

    it('denies a definition the catalog carries without its policies and does not refetch for it', async () => {
        const { store, httpClient } = buildStore({
            'GET /authorization': () => buildAuthorizationCatalog({
                permissions: [{
                    name: 'user_read',
                    realm_id: null,
                    client_id: null,
                    decision_strategy: null,
                    policies: null,
                }],
            }),
        });

        await store.login({ name: 'admin', password: 'start123' });

        expect(findRequests(httpClient, '/authorization')).toHaveLength(1);
        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).rejects.toThrow();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm(AUTHORIZATION_REALM) })).rejects.toThrow();
    });

    it('fails the login and revokes the staged grant when the refetched catalog is stale too', async () => {
        const { store, httpClient } = buildStore({
            'POST /token/introspect': () => ({ ...INTROSPECTION, permissions: LATER_GRANTS }),
            'GET /authorization': () => buildAuthorizationCatalog(),
        });

        await expect(store.login({ name: 'admin', password: 'start123' })).rejects.toThrow(AuthorizationCatalogStaleError);

        expect(findRequests(httpClient, '/authorization')).toHaveLength(2);
        expect(store.status.value).toEqual(StoreAuthStatus.UNAUTHENTICATED);
        expect(store.accessToken.value).toBeNull();
        expect(findRequests(httpClient, '/token/revoke')).toHaveLength(2);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).rejects.toThrow();

        // a catalog known to be stale is not served again: the next login
        // fetches anew
        await expect(store.login({ name: 'admin', password: 'start123' })).rejects.toThrow(AuthorizationCatalogStaleError);
        expect(findRequests(httpClient, '/authorization')).toHaveLength(4);
    });

    it('falls back to the name-only view when the server has no authorization route', async () => {
        const { store, httpClient } = buildStore({
            'POST /token/introspect': () => ({
                ...INTROSPECTION,
                permissions: [...buildAuthorizationGrants(), { name: 'legacy_only' }],
            }),
            'GET /authorization': () => {
                throw createResponseError(404, 'Not Found');
            },
        });

        await store.login({ name: 'admin', password: 'start123' });

        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'legacy_only' })).resolves.toBeUndefined();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm('realm-2') })).resolves.toBeUndefined();

        // the 404 is memoized like a catalog: a revalidation does not probe again
        store.applyTokenGrantResponse({ ...GRANT_RESPONSE, access_token: 'xyz-2' });
        await store.resolve();

        expect(findRequests(httpClient, '/authorization')).toHaveLength(1);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'legacy_only' })).resolves.toBeUndefined();
    });

    it('falls back to the name-only view on a 403 and asks again for the next signed-in session', async () => {
        const { store, httpClient } = buildStore({
            'GET /authorization': () => {
                throw createResponseError(403, 'Forbidden');
            },
        });

        await store.login({ name: 'admin', password: 'start123' });

        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
        expect(findRequests(httpClient, '/authorization')).toHaveLength(1);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm('realm-2') })).resolves.toBeUndefined();

        // a 403 is per credential: the memo does not outlive the session
        await store.logout();
        await store.login({ name: 'admin', password: 'start123' });

        expect(findRequests(httpClient, '/authorization')).toHaveLength(2);
        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
    });

    it('treats any other failure like a failed introspection: nothing committed, the grant revoked, the next login retries', async () => {
        let calls = 0;
        const { store, httpClient } = buildStore({
            'GET /authorization': () => {
                calls += 1;
                if (calls === 1) {
                    throw createResponseError(503, 'Service unavailable.');
                }

                return buildAuthorizationCatalog();
            },
        });

        await expect(store.login({ name: 'admin', password: 'start123' })).rejects.toThrow();

        expect(store.status.value).toEqual(StoreAuthStatus.UNAUTHENTICATED);
        expect(store.accessToken.value).toBeNull();
        expect(findRequests(httpClient, '/token/revoke')).toHaveLength(2);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).rejects.toThrow();

        await store.login({ name: 'admin', password: 'start123' });

        expect(findRequests(httpClient, '/authorization')).toHaveLength(2);
        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm(AUTHORIZATION_REALM) })).resolves.toBeUndefined();
    });

    it('refuses an introspection naming no subject', async () => {
        const { store } = buildStore({ 'POST /token/introspect': () => ({ ...INTROSPECTION, sub: undefined }) });

        await expect(store.login({ name: 'admin', password: 'start123' }))
            .rejects.toThrow('The introspection names no subject.');
        expect(store.status.value).toEqual(StoreAuthStatus.UNAUTHENTICATED);

        const otherKind = buildStore({ 'POST /token/introspect': () => ({ ...INTROSPECTION, sub_kind: 'robot' }) });

        await expect(otherKind.store.login({ name: 'admin', password: 'start123' }))
            .rejects.toThrow('The introspection names no subject.');
        expect(otherKind.store.status.value).toEqual(StoreAuthStatus.UNAUTHENTICATED);
    });

    it('builds a cookie session from the session introspection grants and the catalog', async () => {
        const { store, httpClient } = buildStore({}, true);

        await store.resolve();

        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
        const requests = findRequests(httpClient, '/authorization');
        expect(requests).toHaveLength(1);
        expect(requests[0].headers.authorization).toBeUndefined();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm(AUTHORIZATION_REALM) })).resolves.toBeUndefined();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm('realm-2') })).rejects.toThrow();
    });

    it('resets the evaluator on logout and fetches the catalog anew for the next login', async () => {
        const { store, httpClient } = buildStore();

        await store.login({ name: 'admin', password: 'start123' });
        await store.logout();

        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).rejects.toThrow();

        await store.login({ name: 'admin', password: 'start123' });

        expect(findRequests(httpClient, '/authorization')).toHaveLength(2);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm(AUTHORIZATION_REALM) })).resolves.toBeUndefined();
    });
});
