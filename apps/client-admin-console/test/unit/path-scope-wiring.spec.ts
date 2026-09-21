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
async function mountScope(path: string, withRealm = true) {
    const requests : string[] = [];

    const httpClient = createFakeClient({
        handlers: {
            'GET /paths': (request: { url: string }) => {
                requests.push(request.url);

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
    const realm = ref<string | undefined>(withRealm ? REALM_ID : undefined);
    let scope : PathScope | undefined;

    const component = defineComponent({
        setup() {
            scope = usePathScope({ realmId: realm, enabled });

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

    // the permission check settles after the first paint, exactly as
    // `usePermissionCheck` does on a real page
    enabled.value = true;
    await flushPromises();

    return {
        scope: scope as PathScope,
        requests,
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

    // The store hydrates the managed realm after the first paint, so a
    // `?path=` link is read before the realm it lives in is known. An empty
    // id list published there is a CONSTANT-FALSE filter, and the load it
    // triggers races the settled scope's own reload, which is how a folder
    // that holds rows ended up listing none of them.
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
});
