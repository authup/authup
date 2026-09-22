/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { HTTPClientSymbol } from '@authup/client-web-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { defineComponent, h, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import type { PathScope } from '../../src/composables/path-scope';
import { usePathScope } from '../../src/composables/path-scope';

const REALM_ID = 'ed64e8c9-5ba2-4a23-86ca-64a38563696a';

const PATHS = [
    {
        id: 'id-sales',
        path: 'sales',
        realmId: REALM_ID,
    },
    {
        id: 'id-berlin',
        path: 'sales/berlin',
        realmId: REALM_ID,
    },
    {
        id: 'id-east',
        path: 'sales/berlin/east',
        realmId: REALM_ID,
    },
    {
        id: 'id-other',
        path: 'engineering',
        realmId: REALM_ID,
    },
];

/**
 * Mount `usePathScope` the way a collection page does: behind a real router
 * carrying `?path=`, and behind a permission check that starts fail-closed
 * and settles one tick later, which is what an actual page hands it.
 */
type MountOptions = {
    withRealm?: boolean,
    /** Leave the permission check unsettled after mount. */
    unsettled?: boolean,
    /** Answer the subtree lookup with a failure. */
    failLookup?: () => boolean
};

async function mountScope(path: string, withRealm: boolean | MountOptions = true) {
    const options : MountOptions = typeof withRealm === 'boolean' ? { withRealm } : withRealm;
    const requests : string[] = [];

    const httpClient = createFakeClient({
        handlers: {
            'GET /paths': (request: { url: string }) => {
                requests.push(request.url);

                if (options.failLookup && options.failLookup() && decodeURIComponent(request.url).includes('startsWith')) {
                    throw new Error('lookup failed');
                }

                const filter = decodeURIComponent(request.url);
                const data = filter.includes('startsWith') ?
                    PATHS.filter((entry) => entry.path === path || entry.path.startsWith(`${path}/`)) :
                    PATHS;

                return {
                    data,
                    meta: { total: data.length },
                };
            },
        },
    });

    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/users', component: { render: () => null } }],
    });

    await router.push(`/users?path=${encodeURIComponent(path)}`);

    const enabled = ref<boolean>(false);
    const settled = ref<boolean>(false);
    const realm = ref<string | undefined>((options.withRealm ?? true) ? REALM_ID : undefined);
    let scope : PathScope | undefined;

    const component = defineComponent({
        setup() {
            scope = usePathScope({
                realmId: realm, 
                enabled, 
                settled, 
            });

            return () => h('div');
        },
    });

    mount(component, {
        global: {
            plugins: [router],
            provide: { [HTTPClientSymbol]: httpClient },
        },
    });

    await flushPromises();

    const atMount = {
        pending: (scope as PathScope).pending.value,
        filters: (scope as PathScope).filters.value,
    };

    // the permission check settles after the first paint, exactly as
    // `usePermissionCheck` does on a real page
    if (!options.unsettled) {
        enabled.value = true;
        settled.value = true;
        await flushPromises();
    }

    return {
        scope: scope as PathScope,
        requests,
        atMount,
        async settle(allowed: boolean) {
            enabled.value = allowed;
            settled.value = true;
            await flushPromises();
        },
        async settleRealm() {
            realm.value = REALM_ID;
            await flushPromises();
        },
    };
}

describe('src/composables/path-scope -> usePathScope', () => {
    it('should resolve a deep-linked folder into the ids the list filters by', async () => {
        const { scope } = await mountScope('sales');

        // the whole point of the scope: `?path=sales` lists the rows filed
        // under `sales` and everything below it, never nothing at all
        expect(scope.filters.value).toEqual({ pathId: ['id-sales', 'id-berlin', 'id-east'] });
        expect(scope.pending.value).toBe(false);
    });

    // Unresolved and empty are opposites that look alike: an empty id
    // list is a CONSTANT-FALSE filter, so a scope publishing one before its
    // lookup answered makes every load taken in that window list nothing.
    // The console normally knows its realm before a page mounts (the routing
    // guard awaits `store.resolve()`), so this pins the composable's own
    // contract rather than a state the console routinely enters.
    it('should hold a folder unresolved until the realm is known', async () => {
        const scoped = await mountScope('sales', false);

        expect(scoped.scope.pending.value).toBe(true);
        expect(scoped.scope.filters.value).toEqual({});

        await scoped.settleRealm();

        expect(scoped.scope.pending.value).toBe(false);
        expect(scoped.scope.filters.value).toEqual({ pathId: ['id-sales', 'id-berlin', 'id-east'] });
    });

    it('should settle an unscoped page even without a realm', async () => {
        const scoped = await mountScope('', false);

        // no folder named, so nothing is pending: the page lists every row
        // it would have listed anyway
        expect(scoped.scope.pending.value).toBe(false);
        expect(scoped.scope.filters.value).toEqual({});
    });

    it('should offer the realm folders the pane renders', async () => {
        const { scope } = await mountScope('sales');

        expect(scope.options.value.map((entry) => entry.path)).toEqual([
            'sales',
            'sales/berlin',
            'sales/berlin/east',
            'engineering',
        ]);
        expect(scope.optionsTruncated.value).toBe(false);
    });
    // #3632: at mount the permission check is still at its fail-closed
    // default, so `path` reads null. Without the settle signal the scope
    // read as unscoped and the first load listed every row in the realm.
    it('should hold a deep-linked folder pending until the permission check settles', async () => {
        const scoped = await mountScope('sales', { unsettled: true });

        expect(scoped.atMount.pending).toBe(true);
        expect(scoped.scope.pending.value).toBe(true);
        expect(scoped.scope.filters.value).toEqual({});

        await scoped.settle(true);

        expect(scoped.scope.pending.value).toBe(false);
        expect(scoped.scope.filters.value).toEqual({ pathId: ['id-sales', 'id-berlin', 'id-east'] });
    });

    it('should release a deep link once the permission check settles negative', async () => {
        const scoped = await mountScope('sales', { unsettled: true });

        await scoped.settle(false);

        // no PATH_READ, no scope: the page lists what it would have anyway
        expect(scoped.scope.pending.value).toBe(false);
        expect(scoped.scope.filters.value).toEqual({});
        expect(scoped.requests).toHaveLength(0);
    });

    it('should not hold an unscoped page for the permission check', async () => {
        const scoped = await mountScope('', { unsettled: true });

        expect(scoped.atMount.pending).toBe(false);
    });

    // Fail-closed stays: the failure lists nothing. What changes is that the
    // page can tell it from an empty folder and offer a retry.
    it('should report a failed lookup and resolve on retry', async () => {
        let failing = true;
        const scoped = await mountScope('sales', { failLookup: () => failing });

        expect(scoped.scope.failed.value).toBe(true);
        expect(scoped.scope.missing.value).toBe(false);
        expect(scoped.scope.filters.value).toEqual({ pathId: [] });

        failing = false;
        scoped.scope.retry();

        // the notice clears as soon as the new lookup starts (#3632)
        expect(scoped.scope.pending.value).toBe(true);
        expect(scoped.scope.failed.value).toBe(false);

        await flushPromises();

        expect(scoped.scope.failed.value).toBe(false);
        expect(scoped.scope.filters.value).toEqual({ pathId: ['id-sales', 'id-berlin', 'id-east'] });
    });

    it('should report a folder that no longer exists', async () => {
        const { scope } = await mountScope('gone');

        expect(scope.missing.value).toBe(true);
        expect(scope.failed.value).toBe(false);
        expect(scope.filters.value).toEqual({ pathId: [] });
    });

    it('should report nothing missing for a folder that exists', async () => {
        const { scope } = await mountScope('sales/berlin');

        expect(scope.missing.value).toBe(false);
    });
    // The pane's lookup carries the same generation guard as the scope's, so
    // an older realm's answer landing late cannot replace the newer tree.
    it('should keep the newer realm tree when an older lookup lands late', async () => {
        const OTHER_REALM_ID = '9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f';
        const slow = Promise.withResolvers<void>();

        const httpClient = createFakeClient({
            handlers: {
                'GET /paths': async (request: { url: string }) => {
                    const url = decodeURIComponent(request.url);
                    if (url.includes(REALM_ID)) {
                        await slow.promise;
                        return { data: [PATHS[0]], meta: { total: 1 } };
                    }

                    return {
                        data: [{
                            id: 'id-ops', 
                            path: 'ops', 
                            realmId: OTHER_REALM_ID, 
                        }],
                        meta: { total: 1 },
                    };
                },
            },
        });

        const router = createRouter({
            history: createMemoryHistory(),
            routes: [{ path: '/users', component: { render: () => null } }],
        });
        await router.push('/users');

        const realm = ref<string>(REALM_ID);
        let scope : PathScope | undefined;

        mount(defineComponent({
            setup() {
                scope = usePathScope({ realmId: realm });

                return () => h('div');
            },
        }), {
            global: {
                plugins: [router],
                provide: { [HTTPClientSymbol]: httpClient },
            },
        });

        await flushPromises();

        realm.value = OTHER_REALM_ID;
        await flushPromises();

        slow.resolve();
        await flushPromises();

        expect(scope!.options.value.map((entry) => entry.path)).toEqual(['ops']);
    });
});
