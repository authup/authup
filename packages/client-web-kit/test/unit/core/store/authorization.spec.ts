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
import { AUTHORIZATION_REALM, AUTHORIZATION_SUBJECT, buildAuthorizationDocument } from '../../../utils/authorization';

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
    permissions: [{ name: 'user_read' }, { name: 'legacy_only' }],
};

function createResponseError(status: number, message: string) {
    return Object.assign(new Error(message), { response: { status, data: { message } } });
}

function buildStore(handlers: FakeHandlerMap = {}, cookieSession = false) {
    const httpClient = createFakeClient({
        handlers: {
            'POST /token': () => ({
                access_token: 'xyz', 
                token_type: 'Bearer', 
                expires_in: 3600, 
                refresh_token: 'abc',
            }),
            'POST /token/introspect': () => ({ ...INTROSPECTION }),
            'GET /sessions/@me/introspect': () => ({ ...INTROSPECTION }),
            'GET /authorization': () => buildAuthorizationDocument(),
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

function findAuthorizationRequest(httpClient: FakeClient) : FakeRequest | undefined {
    return httpClient.requests.find(
        (request) => new URL(request.url, 'http://localhost').pathname === '/authorization',
    );
}

describe('core/store (authorization document)', () => {
    it('fetches the document with the staged bearer and gates by realm reach', async () => {
        const { store, httpClient } = buildStore();
        const evaluator = store.permissionEvaluator;

        await store.login({ name: 'admin', password: 'start123' });

        const request = findAuthorizationRequest(httpClient);
        expect(request?.headers.authorization).toEqual('Bearer xyz');
        expect(store.permissionEvaluator).toBe(evaluator);

        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).resolves.toBeUndefined();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm(AUTHORIZATION_REALM) })).resolves.toBeUndefined();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm('realm-2') })).rejects.toThrow();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'legacy_only' })).rejects.toThrow();
    });

    it('falls back to the name-only view when the server has no authorization route', async () => {
        const { store } = buildStore({
            'GET /authorization': () => {
                throw createResponseError(404, 'Not Found');
            },
        });

        await store.login({ name: 'admin', password: 'start123' });

        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'legacy_only' })).resolves.toBeUndefined();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm('realm-2') })).resolves.toBeUndefined();
    });

    it('treats any other failure like a failed introspection: nothing committed, the grant revoked', async () => {
        const { store, httpClient } = buildStore({
            'GET /authorization': () => {
                throw createResponseError(503, 'Service unavailable.');
            },
        });

        await expect(store.login({ name: 'admin', password: 'start123' })).rejects.toThrow();

        expect(store.status.value).toEqual(StoreAuthStatus.UNAUTHENTICATED);
        expect(store.accessToken.value).toBeNull();
        expect(httpClient.requests.filter((item) => item.url.endsWith('/token/revoke'))).toHaveLength(2);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).rejects.toThrow();
    });

    it('refuses a document naming another subject', async () => {
        const { store } = buildStore({
            'GET /authorization': () => buildAuthorizationDocument({
                identity: {
                    id: 'someone-else', 
                    type: 'user', 
                    realm_id: AUTHORIZATION_REALM, 
                    realm_name: 'master', 
                    client_id: null,
                },
            }),
        });

        await expect(store.login({ name: 'admin', password: 'start123' })).rejects.toThrow();
        expect(store.status.value).toEqual(StoreAuthStatus.UNAUTHENTICATED);
    });

    it('fetches the document on a cookie session without a bearer', async () => {
        const { store, httpClient } = buildStore({}, true);

        await store.resolve();

        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
        const request = findAuthorizationRequest(httpClient);
        expect(request).toBeDefined();
        expect(request?.headers.authorization).toBeUndefined();
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read', data: realm('realm-2') })).rejects.toThrow();
    });

    it('resets the evaluator on logout', async () => {
        const { store } = buildStore();
        await store.login({ name: 'admin', password: 'start123' });
        await store.logout();

        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).rejects.toThrow();
    });
});
