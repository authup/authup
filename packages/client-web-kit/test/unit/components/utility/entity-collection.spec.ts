/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role, Session } from '@authup/core-kit';
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

/**
 * A collection over an entity whose schema allows no search field beyond
 * `name`, so the default condition stays a plain `contains`.
 */
function mountSessionCollection() {
    const component = defineComponent({
        props: defineEntityCollectionVProps<Session>(),
        emits: defineEntityCollectionVEmitOptions<Session>(),
        setup(props, setup) {
            const manager = defineEntityCollectionManager<'session'>({
                type: 'session',
                props,
                setup,
                socket: false,
            });

            return () => manager.render();
        },
    });

    return mountKitComponent(component, {}, {
        'GET /sessions': () => ({
            data: [],
            meta: {
                total: 0, 
                limit: 10, 
                offset: 0, 
            }, 
        }), 
    });
}

function listRequests(requests: FakeRequest[], pathname = '/roles') : URL[] {
    return requests
        .filter((request) => request.method === 'GET')
        .map((request) => new URL(request.url, 'http://fake.test'))
        .filter((url) => url.pathname === pathname);
}

describe('defineEntityCollectionManager (rapiq IR composition)', () => {
    it('sends the base query (build-input prop) on the initial load', async () => {
        const { httpClient } = mountCollection({
            query: {
                filters: { realmId: ['realm-1', null] },
                sorts: { updatedAt: 'DESC' },
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
            .toEqual("and(or(contains(name,'foo'),contains(displayName,'foo')),in(realmId,'realm-1',null))");

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
            .toEqual("and(or(contains(name,'foo'),contains(displayName,'foo')),in(realmId,'realm-1',null))");
        expect(requests[2].searchParams.get('page[offset]')).toEqual('10');
    });

    /**
     * The shape every filter control has to use (#3443). A load that omits
     * `pagination` inherits the retained `meta` offset, so a control that
     * narrows the result set from page 2 or later requests rows past the end
     * of the narrower set: an empty list under a non-zero total. `ASearch`
     * has always reset it by hand; the sessions page's subject-kind select
     * was the first control that did not.
     */
    it('an assembled filter load carrying offset 0 returns to the first page', async () => {
        const { wrapper, httpClient } = mountCollection({ query: { filters: { realmId: ['realm-1', null] } } });
        await flushPromises();

        await (wrapper.vm as any).load({ pagination: { limit: 10, offset: 20 } });

        // what the page hands the manager: an assembled Query, no limit
        await (wrapper.vm as any).load(defineQuery({
            filters: { name: 'foo' },
            pagination: { offset: 0 },
        }));

        const requests = listRequests(httpClient.requests);
        // the encoder omits an offset of 0, so absent and "0" both mean the
        // first page. Without the reset this reads "20" and the page renders
        // empty under a non-zero total.
        expect(requests[2].searchParams.get('page[offset]') ?? '0').toEqual('0');
        // the retained page size survives, because `Pagination.merge` is
        // per-property and the input carries no limit
        expect(requests[2].searchParams.get('page[limit]')).toEqual('10');
    });

    /**
     * The manager owns the retained pagination, so it owns the reset: a
     * load that CHANGES the filters and carries no pagination of its own
     * must not inherit the current offset. Before this, every narrowing
     * control had to reset by hand and the sessions subject-kind select
     * was the one that forgot (#3443).
     */
    it('a filter change drops the retained offset without the caller asking', async () => {
        const { wrapper, httpClient } = mountCollection({ query: { filters: { realmId: ['realm-1', null] } } });
        await flushPromises();

        await (wrapper.vm as any).load({ pagination: { limit: 10, offset: 20 } });
        await (wrapper.vm as any).load(defineQuery({ filters: { name: 'foo' } }));

        const requests = listRequests(httpClient.requests);
        expect(requests[2].searchParams.get('page[offset]') ?? '0').toEqual('0');
        // the page size is not a narrowing parameter and survives
        expect(requests[2].searchParams.get('page[limit]')).toEqual('10');
    });

    /**
     * The reset keys on a CHANGE, not on the mere presence of filters: a
     * load repeating the current filters is a refresh, and paging through
     * a result set must not snap back to the first page.
     */
    it('a load repeating the same filters keeps the current page', async () => {
        const { wrapper, httpClient } = mountCollection({ query: { filters: { realmId: ['realm-1', null] } } });
        await flushPromises();

        await (wrapper.vm as any).load({ filters: { name: 'foo' } });
        await (wrapper.vm as any).load({ pagination: { limit: 10, offset: 20 } });
        await (wrapper.vm as any).load({ filters: { name: 'foo' } });

        const requests = listRequests(httpClient.requests);
        expect(requests[3].searchParams.get('page[offset]')).toEqual('20');
    });

    /**
     * An input carrying its own pagination still wins: the reset feeds the
     * retained state, which sits below the input in the merge.
     */
    it('an explicit offset survives a filter change', async () => {
        const { wrapper, httpClient } = mountCollection({ query: { filters: { realmId: ['realm-1', null] } } });
        await flushPromises();

        await (wrapper.vm as any).load({ pagination: { limit: 10, offset: 20 } });
        await (wrapper.vm as any).load(defineQuery({
            filters: { name: 'foo' },
            pagination: { offset: 30 },
        }));

        const requests = listRequests(httpClient.requests);
        expect(requests[2].searchParams.get('page[offset]')).toEqual('30');
    });

    /**
     * rapiq 2.1.0 (#906) made `sorts` the canonical build-input key and
     * kept `sort` as a deprecated alias. The per-parameter replace must
     * recognize both, or a load carrying the canonical spelling is
     * silently dropped in favour of the retained interactive sorts.
     */
    it.each(['sorts', 'sort'] as const)('a load carrying %s replaces the retained sorts', async (key) => {
        const { wrapper, httpClient } = mountCollection({ query: { filters: { realmId: ['realm-1', null] } } });
        await flushPromises();

        await (wrapper.vm as any).load({ [key]: { updatedAt: 'DESC' } });
        await (wrapper.vm as any).load({ [key]: { name: 'ASC' } });

        const requests = listRequests(httpClient.requests);
        expect(requests[1].searchParams.get('sort')).toEqual('-updatedAt');
        expect(requests[2].searchParams.get('sort')).toEqual('name');
    });

    /**
     * rapiq documents `{ sorts: props.sorts, sort: props.sort }` as a safe
     * spread migration wrapper: an undefined side never trips
     * KEY_AMBIGUOUS. Both keys are then own properties, so a presence
     * (`in`) test would read that as "sorts supplied" and wipe them.
     */
    it('a load carrying only undefined sort spellings keeps the retained sorts', async () => {
        const { wrapper, httpClient } = mountCollection({ query: { filters: { realmId: ['realm-1', null] } } });
        await flushPromises();

        await (wrapper.vm as any).load({ sorts: { updatedAt: 'DESC' } });
        await (wrapper.vm as any).load({
            sorts: undefined, 
            sort: undefined, 
            pagination: { offset: 10 }, 
        });

        const requests = listRequests(httpClient.requests);
        expect(requests[2].searchParams.get('sort')).toEqual('-updatedAt');
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

    it('searches name alone for an entity carrying no extra search field', async () => {
        const { wrapper, httpClient } = mountSessionCollection();
        await flushPromises();

        await (wrapper.vm as any).load({ filters: { name: 'foo' } });

        const requests = listRequests(httpClient.requests, '/sessions');
        expect(requests[1].searchParams.get('filter'))
            .toEqual("contains(name,'foo')");
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
