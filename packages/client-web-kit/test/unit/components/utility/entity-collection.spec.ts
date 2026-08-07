/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role } from '@authup/core-kit';
import type { FakeRequest } from '@authup/core-http-kit/testing';
import {
    contains,
    defineQuery,
    or,
} from '@rapiq/core';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';
import type { EntityCollectionManagerCreateContext } from '../../../../src/components/utility';
import {
    defineEntityCollectionManager,
    defineEntityCollectionVEmitOptions,
    defineEntityCollectionVProps,
} from '../../../../src/components/utility';
import type { Options } from '../../../../src/types';
import { mountKitComponent } from '../../../utils';
import { createFakeHydrationStore } from '../../../utils/hydration';

type ManagerContextOverrides = Partial<Omit<
    EntityCollectionManagerCreateContext<'role', Role>,
'type' | 'props' | 'setup'
>>;

function createCollectionComponent(context: ManagerContextOverrides = {}) {
    return defineComponent({
        props: defineEntityCollectionVProps<Role>(),
        emits: defineEntityCollectionVEmitOptions<Role>(),
        setup(props, setup) {
            const manager = defineEntityCollectionManager<'role'>({
                type: 'role',
                props,
                setup,
                socket: false,
                ...context,
            });

            return () => manager.render();
        },
    });
}

function mountCollection(
    props: Record<string, any> = {},
    context: ManagerContextOverrides = {},
    overrides: Partial<Options> = {},
) {
    return mountKitComponent(createCollectionComponent(context), props, {
        'GET /roles': (req: FakeRequest) => {
            const url = new URL(req.url, 'http://fake.test');
            const limit = Number(url.searchParams.get('page[limit]') ?? 10);
            const offset = Number(url.searchParams.get('page[offset]') ?? 0);

            return {
                data: [],
                meta: {
                    total: 0,
                    limit,
                    offset,
                },
            };
        },
    }, overrides);
}

function listRequests(requests: FakeRequest[]) : URL[] {
    return requests
        .filter((request) => request.method === 'GET')
        .map((request) => new URL(request.url, 'http://fake.test'))
        .filter((url) => url.pathname === '/roles');
}

describe('defineEntityCollectionManager (rapiq IR composition)', () => {
    it('sends the base query (build-input prop) on the initial load', async () => {
        const { httpClient } = mountCollection({
            query: {
                filters: { realmId: ['realm-1', null] },
                sort: { updatedAt: 'DESC' },
            },
        });
        await flushPromises();

        const [request] = listRequests(httpClient.requests);
        expect(request).toBeDefined();
        expect(request.searchParams.get('filter')).toEqual("in(realmId,'realm-1',null)");
        expect(request.searchParams.get('sort')).toEqual('-updatedAt');
        expect(request.searchParams.get('page[limit]')).toEqual('10');
    });

    it('accepts an assembled query (IQuery prop) as base', async () => {
        const { httpClient } = mountCollection({ query: defineQuery<Role>({ filters: { realmId: ['realm-1', null] } }) });
        await flushPromises();

        const [request] = listRequests(httpClient.requests);
        expect(request.searchParams.get('filter')).toEqual("in(realmId,'realm-1',null)");
    });

    it('search input cannot displace the injected scope (AND composition)', async () => {
        const { wrapper, httpClient } = mountCollection({ query: { filters: { realmId: ['realm-1', null] } } });
        await flushPromises();

        await (wrapper.vm as any).load({
            filters: { name: 'foo' },
            pagination: { offset: 0 },
        });

        const requests = listRequests(httpClient.requests);
        expect(requests).toHaveLength(2);
        expect(requests[1].searchParams.get('filter'))
            .toEqual("and(contains(name,'foo'),in(realmId,'realm-1',null))");

        // even an input targeting the scoped field only narrows further
        await (wrapper.vm as any).load({ filters: { realmId: 'other' } });

        const next = listRequests(httpClient.requests);
        expect(next[2].searchParams.get('filter'))
            .toEqual("and(eq(realmId,'other'),in(realmId,'realm-1',null))");
    });

    it('a pagination-only load keeps the current search', async () => {
        const { wrapper, httpClient } = mountCollection({ query: { filters: { realmId: ['realm-1', null] } } });
        await flushPromises();

        await (wrapper.vm as any).load({
            filters: { name: 'foo' },
            pagination: { offset: 0 },
        });
        await (wrapper.vm as any).load({ pagination: { offset: 10 } });

        const requests = listRequests(httpClient.requests);
        expect(requests).toHaveLength(3);
        expect(requests[2].searchParams.get('filter'))
            .toEqual("and(contains(name,'foo'),in(realmId,'realm-1',null))");
        expect(requests[2].searchParams.get('page[offset]')).toEqual('10');
    });

    it('clearing the search (empty filters) resets to the base scope', async () => {
        const { wrapper, httpClient } = mountCollection({ query: { filters: { realmId: ['realm-1', null] } } });
        await flushPromises();

        await (wrapper.vm as any).load({ filters: { name: 'foo' } });
        await (wrapper.vm as any).load({ filters: {} });

        const requests = listRequests(httpClient.requests);
        expect(requests[2].searchParams.get('filter'))
            .toEqual("in(realmId,'realm-1',null)");
    });

    it('queryFilters may return a compound condition (OR search)', async () => {
        const { wrapper, httpClient } = mountCollection(
            { query: { filters: { realmId: ['realm-1', null] } } },
            { queryFilters: (q) => or(contains('name', q), contains('displayName', q)) },
        );
        await flushPromises();

        await (wrapper.vm as any).load({ filters: { name: 'foo' } });

        const requests = listRequests(httpClient.requests);
        expect(requests[1].searchParams.get('filter'))
            .toEqual("and(or(contains(name,'foo'),contains(displayName,'foo')),in(realmId,'realm-1',null))");
    });

    it('an assembled load input replaces the interactive state wholesale', async () => {
        const { wrapper, httpClient } = mountCollection({ query: { filters: { realmId: ['realm-1', null] } } });
        await flushPromises();

        await (wrapper.vm as any).load({ filters: { name: 'foo' } });
        await (wrapper.vm as any).load(defineQuery<Role>({ filters: { displayName: 'bar' } }));

        const requests = listRequests(httpClient.requests);
        expect(requests[2].searchParams.get('filter'))
            .toEqual("and(eq(displayName,'bar'),in(realmId,'realm-1',null))");
    });

    it('composes context query and props query, both non-displaceable', async () => {
        const { httpClient } = mountCollection(
            { query: { filters: { realmId: ['realm-1', null] } } },
            { query: () => ({ filters: { clientId: 'c-1' } }) as any },
        );
        await flushPromises();

        const [request] = listRequests(httpClient.requests);
        expect(request.searchParams.get('filter'))
            .toEqual("and(in(realmId,'realm-1',null),eq(clientId,'c-1'))");
    });
});

describe('defineEntityCollectionManager (hydration handoff)', () => {
    // must match what the server render writes (see
    // entity-collection-hydration.spec.ts)
    const key = 'authup:collection:role?codec=url-expression&page%5Blimit%5D=10';

    const snapshot = {
        data: [{ id: 'role-1', name: 'admin' }],
        total: 1,
        pagination: {
            limit: 10,
            offset: 0,
        },
    };

    it('adopts a server-rendered snapshot instead of fetching', async () => {
        const hydration = createFakeHydrationStore({ [key]: snapshot });

        const { wrapper, httpClient } = mountKitComponent(
            createCollectionComponent(),
            {},
            {},
            { hydrationStore: hydration.store },
        );
        await flushPromises();

        expect(listRequests(httpClient.requests)).toHaveLength(0);
        expect((wrapper.vm as any).data).toEqual(snapshot.data);
    });

    it('consumes the snapshot once, so a later visit loads fresh data', async () => {
        const hydration = createFakeHydrationStore({ [key]: snapshot });

        mountKitComponent(createCollectionComponent(), {}, {}, { hydrationStore: hydration.store });
        await flushPromises();

        expect(hydration.entries).toEqual({});

        const { httpClient } = mountKitComponent(
            createCollectionComponent(),
            {},
            {
                'GET /roles': () => ({
                    data: [],
                    meta: {
                        total: 0,
                        limit: 10,
                        offset: 0,
                    },
                }),
            },
            { hydrationStore: hydration.store },
        );
        await flushPromises();

        expect(listRequests(httpClient.requests)).toHaveLength(1);
    });

    it('fetches when the snapshot belongs to a different query', async () => {
        const hydration = createFakeHydrationStore({ [key]: snapshot });

        const { httpClient } = mountCollection(
            { query: { filters: { realmId: 'realm-1' } } },
            {},
            { hydrationStore: hydration.store },
        );
        await flushPromises();

        expect(listRequests(httpClient.requests)).toHaveLength(1);
        expect(hydration.entries[key]).toBeDefined();
    });
});
