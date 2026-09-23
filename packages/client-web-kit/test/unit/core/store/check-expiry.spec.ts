/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationCheckPermissions } from '@authup/access';
import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeClient } from '@authup/core-http-kit/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, defineStore } from 'pinia';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type { Ref } from 'vue';
import { defineComponent, h } from 'vue';
import { createPermissionCheckerReactiveFn } from '../../../../src/core/permission-check';
import { StoreAuthStatus, createStore, createStoreDispatcher } from '../../../../src/core/store';
import {
    AUTHORIZATION_REALM,
    AUTHORIZATION_SUBJECT,
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

type CheckAnswer = {
    permissions: AuthorizationCheckPermissions,
    maxAge?: number,
};

/**
 * The fake client answers no response headers, so the max-age the server
 * would send is stubbed on the one method that reads it.
 */
function buildStore(answer: () => CheckAnswer | Promise<CheckAnswer>, cookieSession = false) {
    const httpClient : FakeClient = createFakeClient({
        handlers: {
            'POST /token': () => ({ ...GRANT_RESPONSE }),
            'POST /token/introspect': () => ({ ...INTROSPECTION }),
            'GET /sessions/@me/introspect': () => ({ ...INTROSPECTION }),
            'POST /token/revoke': () => ({}),
            'DELETE /sessions/@me': () => ({}),
        },
    });

    let checks = 0;
    httpClient.authorization.checkWithMaxAge = async () => {
        checks += 1;

        const { permissions, maxAge } = await answer();

        return { data: permissions, ...(typeof maxAge === 'number' ? { maxAge } : {}) };
    };

    const storeFactory = defineStore('auth-check-expiry', () => createStore({
        httpClient,
        dispatcher: createStoreDispatcher(),
        cookieSession,
    }));
    const store = storeFactory(createPinia());

    return { store, checks: () => checks };
}

describe('core/store (check expiry)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-23T10:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // A date or time policy settles against the server's clock, so the
    // answer is a snapshot the server dates with a max-age.
    it('refetches on the next resolve once the answer expired, with an unchanged key', async () => {
        const { store, checks } = buildStore(() => ({ permissions: buildAuthorizationCheck(), maxAge: 60 }), true);

        await store.resolve();
        await vi.advanceTimersByTimeAsync(0);
        expect(checks()).toBe(1);

        // before the deadline the memo holds
        await store.resolve();
        await vi.advanceTimersByTimeAsync(0);
        expect(checks()).toBe(1);

        // the clock alone moves past it, without the timer running
        vi.setSystemTime(new Date('2026-09-23T10:01:01Z'));
        await store.resolve();
        await vi.advanceTimersByTimeAsync(0);
        expect(checks()).toBe(2);
    });

    it('refetches the verdicts of an idle tab when the answer expires and swaps them in', async () => {
        let permissions = buildAuthorizationCheck();
        const { store, checks } = buildStore(() => ({ permissions, maxAge: 60 }));

        await store.login({ name: 'admin', password: 'start123' });
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).resolves.toBeUndefined();

        permissions = [];
        await vi.advanceTimersByTimeAsync(59_000);
        expect(checks()).toBe(1);

        await vi.advanceTimersByTimeAsync(1_000);
        expect(checks()).toBe(2);
        expect(store.permissionRevision).toBe(1);
        expect(store.status).toEqual(StoreAuthStatus.AUTHENTICATED);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).rejects.toThrow();

        // and it keeps doing so for as long as the server dates its answers
        await vi.advanceTimersByTimeAsync(60_000);
        expect(checks()).toBe(3);
    });

    it('arms no timer for an answer without a max-age', async () => {
        const { store, checks } = buildStore(() => ({ permissions: buildAuthorizationCheck() }));

        await store.login({ name: 'admin', password: 'start123' });
        await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);

        expect(checks()).toBe(1);
        expect(store.permissionRevision).toBe(0);
    });

    it('waits out a max-age longer than a timer can hold', async () => {
        const days = 40;
        const { store, checks } = buildStore(() => ({
            permissions: buildAuthorizationCheck(),
            maxAge: days * 24 * 60 * 60,
        }));

        await store.login({ name: 'admin', password: 'start123' });

        // past the 2^31-1 ms clamp (about 24.8 days), but before the deadline
        await vi.advanceTimersByTimeAsync(30 * 24 * 60 * 60 * 1000);
        expect(checks()).toBe(1);

        await vi.advanceTimersByTimeAsync(10 * 24 * 60 * 60 * 1000);
        expect(checks()).toBe(2);
    });

    it('stops the timer on logout', async () => {
        const { store, checks } = buildStore(() => ({ permissions: buildAuthorizationCheck(), maxAge: 60 }));

        await store.login({ name: 'admin', password: 'start123' });
        await store.logout();
        await vi.advanceTimersByTimeAsync(120_000);

        expect(checks()).toBe(1);
    });

    it('drops a refetch a logout overtook', async () => {
        const gate = Promise.withResolvers<void>();
        let release : (() => void) | undefined;
        let calls = 0;
        const { store } = buildStore(async () => {
            calls += 1;
            if (calls === 2) {
                release = gate.resolve;
                await gate.promise;
            }

            return { permissions: buildAuthorizationCheck(), maxAge: 60 };
        });

        await store.login({ name: 'admin', password: 'start123' });
        await vi.advanceTimersByTimeAsync(60_000);
        expect(release).toBeDefined();

        await store.logout();
        release!();
        await vi.advanceTimersByTimeAsync(0);

        expect(store.permissionRevision).toBe(0);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).rejects.toThrow();
    });

    // The credential is fine, only a snapshot of its authorization aged.
    it('keeps the session and the previous verdicts when the refetch fails, and tries again', async () => {
        let fail = true;
        let calls = 0;
        const { store, checks } = buildStore(() => {
            calls += 1;
            if (fail && calls > 1) {
                throw new Error('Service unavailable.');
            }

            return { permissions: buildAuthorizationCheck(), maxAge: 60 };
        });

        await store.login({ name: 'admin', password: 'start123' });
        await vi.advanceTimersByTimeAsync(60_000);

        expect(checks()).toBe(2);
        expect(store.status).toEqual(StoreAuthStatus.AUTHENTICATED);
        expect(store.permissionRevision).toBe(0);
        await expect(store.permissionEvaluator.preEvaluateOneOf({ name: 'user_read' })).resolves.toBeUndefined();

        fail = false;
        await vi.advanceTimersByTimeAsync(30_000);

        expect(checks()).toBe(3);
        expect(store.permissionRevision).toBe(1);
    });

    // `status` does not flip for a swap within one session, so a consumer
    // keyed on it alone would keep the verdict it computed at load.
    it('re-evaluates a permission check when the verdicts are swapped', async () => {
        let permissions = buildAuthorizationCheck();
        const { store } = buildStore(() => ({ permissions, maxAge: 60 }));

        await store.login({ name: 'admin', password: 'start123' });

        let outcome!: Ref<boolean>;
        mount(defineComponent({
            setup() {
                const checker = createPermissionCheckerReactiveFn({ store });
                outcome = checker({ name: 'user_read' });

                return () => h('div');
            },
        }));

        await flushPromises();
        expect(outcome.value).toBe(true);

        permissions = [];
        await vi.advanceTimersByTimeAsync(60_000);
        await flushPromises();

        expect(outcome.value).toBe(false);
    });

    // A resolve that runs before the (throttled) timer refetches the expired
    // memo itself and re-arms the timer, so the timer never swaps: the commit
    // has to tell mounted consumers the verdicts changed.
    it('re-evaluates a permission check when a resolve replaces an expired answer', async () => {
        let permissions = buildAuthorizationCheck();
        const { store, checks } = buildStore(() => ({ permissions, maxAge: 60 }), true);

        await store.resolve();
        await vi.advanceTimersByTimeAsync(0);

        let outcome!: Ref<boolean>;
        mount(defineComponent({
            setup() {
                const checker = createPermissionCheckerReactiveFn({ store });
                outcome = checker({ name: 'user_read' });

                return () => h('div');
            },
        }));

        await flushPromises();
        expect(outcome.value).toBe(true);

        // a navigation reusing the memo does not re-evaluate
        const revision = store.permissionRevision;
        await store.resolve();
        await vi.advanceTimersByTimeAsync(0);
        expect(store.permissionRevision).toBe(revision);

        permissions = [];
        vi.setSystemTime(new Date('2026-09-23T10:01:01Z'));
        await store.resolve();
        await vi.advanceTimersByTimeAsync(0);
        await flushPromises();

        expect(checks()).toBe(2);
        expect(store.permissionRevision).toBe(revision + 1);
        expect(outcome.value).toBe(false);
    });
});
