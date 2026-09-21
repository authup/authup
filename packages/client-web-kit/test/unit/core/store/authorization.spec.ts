/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeClient, FakeHandlerMap, FakeRequest } from '@authup/core-http-kit/testing';
import { describe, expect, it } from 'vitest';
import { StoreAuthStatus, createStore, createStoreDispatcher } from '../../../../src/core/store';
import {
    AUTHORIZATION_REALM,
    AUTHORIZATION_SUBJECT,
    buildAuthorizationCatalog,
    buildAuthorizationCheck,
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
            'POST /authorization/check': () => buildAuthorizationCheck(),
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

describe('core/store (authorization)', () => {
    // The store's only authorization source. It is a browser client acting AS
    // the actor, which is the caller this route exists for; `GET /authorization`
    // is the resource-server surface, read with a client credential to decide
    // for many actors, and is deliberately never requested here -- consulting
    // it made the console's gating depend on whether the signed-in user held
    // the permission family it is gated on.
    it('asks the check for every session and never the catalog', async () => {
        const { store, httpClient } = buildStore();
        const evaluator = store.permissionEvaluator;

        await store.login({ name: 'admin', password: 'start123' });

        const requests = findRequests(httpClient, '/authorization/check');
        expect(requests).toHaveLength(1);
        expect(requests[0].headers.authorization).toEqual('Bearer xyz');
        expect(requests[0].body).toEqual({ realms: 'ownOrNull' });
        expect(findRequests(httpClient, '/authorization')).toHaveLength(0);
        expect(store.permissionEvaluator).toBe(evaluator);

        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).resolves.toBeUndefined();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm(AUTHORIZATION_REALM) })).resolves.toBeUndefined();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm('realm-2') })).rejects.toThrow();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_write' })).rejects.toThrow();
    });

    it('falls back to the name-only view for a server that does not serve the route', async () => {
        const { store, httpClient } = buildStore({
            'POST /token/introspect': () => ({
                ...INTROSPECTION,
                permissions: [...buildAuthorizationGrants(), { name: 'legacy_only' }],
            }),
            'POST /authorization/check': () => {
                throw createResponseError(404, 'Not Found');
            },
        });

        await store.login({ name: 'admin', password: 'start123' });

        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
        // coarser than the verdicts: it gates on the grant names alone
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'legacy_only' })).resolves.toBeUndefined();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm('realm-2') })).resolves.toBeUndefined();

        // the 404 is memoized: a revalidation does not probe again
        store.applyTokenGrantResponse({ ...GRANT_RESPONSE, access_token: 'xyz-2' });
        await store.resolve();

        expect(findRequests(httpClient, '/authorization/check')).toHaveLength(1);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'legacy_only' })).resolves.toBeUndefined();
    });

    // The verdicts are per realm and authoritative, where the name-only view
    // they replace passes a grant on its name alone.
    it('answers per realm, and denies a grant the name-only view would have passed', async () => {
        const { store, httpClient } = buildStore({
            'POST /token/introspect': () => ({
                ...INTROSPECTION,
                permissions: [...buildAuthorizationGrants(), { name: 'legacy_only' }],
            }),
        });

        await store.login({ name: 'admin', password: 'start123' });

        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).resolves.toBeUndefined();
        await expect(store.permissionEvaluator.preEvaluateOneOf({
            name: 'user_read',
            data: realm(AUTHORIZATION_REALM),
        })).resolves.toBeUndefined();

        // the answer is per realm: a realm the request never named denies, and
        // so does a grant the name-only view would have passed on its name alone
        await expect(store.permissionEvaluator.preEvaluateOneOf({
            name: 'user_read',
            data: realm('realm-2'),
        })).rejects.toThrow();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'legacy_only' })).rejects.toThrow();

        // it asks about the identity's own realm plus the global rows
        const [request] = findRequests(httpClient, '/authorization/check');
        expect(request?.body).toEqual({ realms: 'ownOrNull' });
    });

    // Unlike the catalog it is per IDENTITY, and a revalidation naming a
    // different subject does NOT clean up, so cleanup() alone cannot key it.
    it('refetches the check when a revalidation names a different subject', async () => {
        let subject = AUTHORIZATION_SUBJECT;
        const other = '9fd1c9ba-7f1c-4a4e-9f7a-2d3b4c5d6e7f';

        const { store, httpClient } = buildStore({
            'POST /token/introspect': () => ({ ...INTROSPECTION, sub: subject }),
            'POST /authorization/check': () => (subject === AUTHORIZATION_SUBJECT ?
                buildAuthorizationCheck() :
                [{ name: 'other_only', realms: [AUTHORIZATION_REALM] }]),
        });

        await store.login({ name: 'admin', password: 'start123' });
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).resolves.toBeUndefined();

        subject = other;
        store.applyTokenGrantResponse({ ...GRANT_RESPONSE, access_token: 'xyz-2' });
        await store.resolve();

        expect(findRequests(httpClient, '/authorization/check')).toHaveLength(2);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'other_only' })).resolves.toBeUndefined();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).rejects.toThrow();
    });

    it('reuses the check while the introspection reports the same grants', async () => {
        const { store, httpClient } = buildStore();

        await store.login({ name: 'admin', password: 'start123' });
        store.applyTokenGrantResponse({ ...GRANT_RESPONSE, access_token: 'xyz-2' });
        await store.resolve();

        expect(findRequests(httpClient, '/authorization/check')).toHaveLength(1);

        await store.logout();
        await store.login({ name: 'admin', password: 'start123' });

        expect(findRequests(httpClient, '/authorization/check')).toHaveLength(2);
    });

    // The answer BAKES the grants in server-side, where the catalog path
    // recomputes from the ones each introspection reports, so a memo keyed by
    // the subject alone would be staler than the path it substitutes for: a
    // role bound or removed mid-session would keep gating on the verdicts the
    // first fetch answered.
    it('refetches the check when a revalidation reports different grants', async () => {
        let grants = buildAuthorizationGrants();

        const { store, httpClient } = buildStore({
            'POST /token/introspect': () => ({ ...INTROSPECTION, permissions: grants }),
            'POST /authorization/check': () => (grants.length > 0 ?
                buildAuthorizationCheck() :
                []),
        });

        await store.login({ name: 'admin', password: 'start123' });
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).resolves.toBeUndefined();

        grants = [];
        store.applyTokenGrantResponse({ ...GRANT_RESPONSE, access_token: 'xyz-2' });
        await store.resolve();

        expect(findRequests(httpClient, '/authorization/check')).toHaveLength(2);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).rejects.toThrow();
    });

    // The server withholds the identity from a bearer holding no `global`
    // scope, so such a token is answered a denying set: the scope is part of
    // what the answer was computed for, not only of who asked.
    it('refetches the check when the token scope changes', async () => {
        let scope = 'global openid';

        const { store, httpClient } = buildStore({
            'POST /token/introspect': () => ({ ...INTROSPECTION, scope }),
            'POST /authorization/check': () => (scope.includes('global') ?
                buildAuthorizationCheck() :
                []),
        });

        await store.login({ name: 'admin', password: 'start123' });
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).resolves.toBeUndefined();

        scope = 'openid';
        store.applyTokenGrantResponse({ ...GRANT_RESPONSE, access_token: 'xyz-2' });
        await store.resolve();

        expect(findRequests(httpClient, '/authorization/check')).toHaveLength(2);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).rejects.toThrow();
    });

    it('treats any other failure like a failed introspection: nothing committed, the grant revoked, the next login retries', async () => {
        let calls = 0;
        const { store, httpClient } = buildStore({
            'POST /authorization/check': () => {
                calls += 1;
                if (calls === 1) {
                    throw createResponseError(503, 'Service unavailable.');
                }

                return buildAuthorizationCheck();
            },
        });

        await expect(store.login({ name: 'admin', password: 'start123' })).rejects.toThrow();

        expect(store.status.value).toEqual(StoreAuthStatus.UNAUTHENTICATED);
        expect(store.accessToken.value).toBeNull();
        expect(findRequests(httpClient, '/token/revoke')).toHaveLength(2);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).rejects.toThrow();

        await store.login({ name: 'admin', password: 'start123' });

        expect(findRequests(httpClient, '/authorization/check')).toHaveLength(2);
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

    it('builds a cookie session from the session introspection and the check', async () => {
        const { store, httpClient } = buildStore({}, true);

        await store.resolve();

        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
        const requests = findRequests(httpClient, '/authorization/check');
        expect(requests).toHaveLength(1);
        // no bearer exists in cookie mode: the session cookie carries it
        expect(requests[0].headers.authorization).toBeUndefined();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm(AUTHORIZATION_REALM) })).resolves.toBeUndefined();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm('realm-2') })).rejects.toThrow();
    });

    it('resets the evaluator on logout and asks anew for the next login', async () => {
        const { store, httpClient } = buildStore();

        await store.login({ name: 'admin', password: 'start123' });
        await store.logout();

        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).rejects.toThrow();

        await store.login({ name: 'admin', password: 'start123' });

        expect(findRequests(httpClient, '/authorization/check')).toHaveLength(2);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm(AUTHORIZATION_REALM) })).resolves.toBeUndefined();
    });
});
