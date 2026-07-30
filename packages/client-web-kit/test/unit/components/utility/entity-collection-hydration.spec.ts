/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// @vitest-environment node

import type { Role } from '@authup/core-kit';
import type { FakeRequest } from '@authup/core-http-kit/testing';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import {
    defineEntityCollectionManager,
    defineEntityCollectionVEmitOptions,
    defineEntityCollectionVProps,
} from '../../../../src/components/utility';
import { createFakeHydrationStore } from '../../../utils/hydration';
import { renderKitComponent } from '../../../utils/ssr';

// entity type plus the serialized query the initial load sends, so the
// server render and the hydrating client derive the same key
const HYDRATION_KEY = 'authup:collection:role?codec=url-expression&page%5Blimit%5D=10';

const ROLES : Partial<Role>[] = [
    { id: 'role-1', name: 'admin' },
];

const collection = defineComponent({
    props: defineEntityCollectionVProps<Role>(),
    emits: defineEntityCollectionVEmitOptions<Role>(),
    setup(props, setup) {
        const manager = defineEntityCollectionManager<'role'>({
            type: 'role',
            props,
            setup,
            socket: false,
        });

        return () => manager.render({ item: { content: (entity) => h('span', entity.name) } });
    },
});

const handlers = {
    'GET /roles': () => ({
        data: ROLES,
        meta: {
            total: ROLES.length,
            limit: 10,
            offset: 0,
        },
    }),
};

function listRequests(requests: FakeRequest[]) : FakeRequest[] {
    return requests.filter(
        (request) => request.method === 'GET' &&
            new URL(request.url, 'http://fake.test').pathname === '/roles',
    );
}

describe('entity collection hydration (server render)', () => {
    it('loads inside the render and records the result for the client', async () => {
        const hydration = createFakeHydrationStore();

        const { html, httpClient } = await renderKitComponent(
            collection,
            {},
            handlers,
            { hydrationStore: hydration.store },
        );

        // the renderer awaited the load, so the rows are in the markup
        expect(html).toContain('admin');
        expect(listRequests(httpClient.requests)).toHaveLength(1);

        expect(Object.keys(hydration.entries)).toEqual([HYDRATION_KEY]);
        expect(hydration.entries[HYDRATION_KEY]).toEqual({
            data: ROLES,
            total: 1,
            pagination: {
                limit: 10,
                offset: 0,
            },
        });
    });

    it('does not load at all without a hydration store', async () => {
        const { html, httpClient } = await renderKitComponent(collection, {}, handlers);

        // nothing could be handed to the client, so the response would only
        // be discarded when the render flushes
        expect(listRequests(httpClient.requests)).toHaveLength(0);
        expect(html).not.toContain('admin');
    });

    it('keys the handoff by the query the load sends', async () => {
        const hydration = createFakeHydrationStore();

        await renderKitComponent(
            collection,
            { query: { filters: { realmId: 'realm-1' } } },
            handlers,
            { hydrationStore: hydration.store },
        );

        expect(Object.keys(hydration.entries)).toEqual([
            "authup:collection:role?codec=url-expression&filter=eq(realmId%2C'realm-1')&page%5Blimit%5D=10",
        ]);
    });

    it('hands nothing over when the load failed', async () => {
        const hydration = createFakeHydrationStore();

        const { html, httpClient } = await renderKitComponent(
            collection,
            {},
            {
                'GET /roles': () => {
                    throw new Error('boom');
                },
            },
            { hydrationStore: hydration.store },
        );

        expect(listRequests(httpClient.requests)).toHaveLength(1);
        expect(html).not.toContain('admin');

        // an empty snapshot would strand the client on the empty list, since
        // adopting one suppresses its own load
        expect(hydration.entries).toEqual({});
    });

    it('never adopts an existing entry while rendering on the server', async () => {
        // A server render is the producer. Were it to adopt, a host backing the
        // store with anything outliving one request would serve one client's
        // rows to another.
        const hydration = createFakeHydrationStore({
            [HYDRATION_KEY]: {
                data: [{ id: 'role-9', name: 'someone-elses-row' }],
                total: 1,
                pagination: { limit: 10, offset: 0 },
            },
        });

        const { html, httpClient } = await renderKitComponent(
            collection,
            {},
            handlers,
            { hydrationStore: hydration.store },
        );

        expect(html).not.toContain('someone-elses-row');
        expect(html).toContain('admin');
        expect(listRequests(httpClient.requests)).toHaveLength(1);
    });

    it('honours loadOnSetup=false', async () => {
        const hydration = createFakeHydrationStore();

        const { httpClient } = await renderKitComponent(
            collection,
            { loadOnSetup: false },
            handlers,
            { hydrationStore: hydration.store },
        );

        expect(listRequests(httpClient.requests)).toHaveLength(0);
        expect(Object.keys(hydration.entries)).toHaveLength(0);
    });
});
