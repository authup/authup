/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role } from '@authup/core-kit';
import type { FakeRequest } from '@authup/core-http-kit/testing';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import type { EntityManager } from '../../../../src/components/utility';
import {
    defineEntityManager,
    defineEntityVEmitOptions,
    defineEntityVProps,
} from '../../../../src/components/utility';
import { mountKitComponent } from '../../../utils';

function createRecord(capture: (manager: EntityManager<Role>) => void) {
    return defineComponent({
        props: defineEntityVProps<Role>(),
        emits: defineEntityVEmitOptions<Role>(),
        setup(props, setup) {
            const manager = defineEntityManager({
                type: 'role',
                props,
                setup,
                socket: false,
            });

            capture(manager);

            return () => h('div', manager.data.value ? manager.data.value.name : 'none');
        },
    });
}

function buildRole(id: string, name: string) : Role {
    return { id, name } as Role;
}

describe('defineEntityManager', () => {
    it('writes through the data bridge and clears it with undefined', async () => {
        let manager : EntityManager<Role> | undefined;
        const { wrapper } = mountKitComponent(createRecord((value) => { manager = value; }));

        manager!.data.value = buildRole('role-1', 'admin');
        await flushPromises();

        expect(manager!.data.value?.id).toEqual('role-1');
        expect(wrapper.text()).toEqual('admin');

        manager!.data.value = undefined;
        await flushPromises();

        expect(manager!.data.value).toBeUndefined();
        expect(wrapper.text()).toEqual('none');
    });

    it('drops a second create while the first is in flight', async () => {
        const { promise: gate, resolve: release } = Promise.withResolvers<void>();

        let manager : EntityManager<Role> | undefined;
        const { wrapper, httpClient } = mountKitComponent(
            createRecord((value) => { manager = value; }),
            {},
            {
                'POST /roles': async (request: FakeRequest) => {
                    await gate;
                    return { data: { id: 'role-1', ...(request.body as Record<string, unknown>) }, meta: {} };
                },
            },
        );

        const first = manager!.create({ name: 'admin' });
        const second = manager!.create({ name: 'admin' });

        expect(manager!.busy.value).toBe(true);

        release();
        await Promise.all([first, second]);
        await flushPromises();

        const creates = httpClient.requests.filter((request) => request.method === 'POST');
        expect(creates).toHaveLength(1);
        expect(manager!.busy.value).toBe(false);
        expect(manager!.data.value?.id).toEqual('role-1');
        expect(wrapper.emitted('created')).toHaveLength(1);
    });

    it('resolves by props.entityId before the resolve query', async () => {
        let manager : EntityManager<Role> | undefined;
        const { wrapper, httpClient } = mountKitComponent(
            createRecord((value) => { manager = value; }),
            { entityId: 'role-1' },
            {
                'GET /roles/:id': (request: FakeRequest) => ({ data: buildRole(request.params.id, 'by-id'), meta: {} }),
                'GET /roles': () => ({ data: [buildRole('role-2', 'by-query')], meta: { total: 1 } }),
            },
        );

        await manager!.resolve({ query: { filters: { name: 'by-query' } } });
        await flushPromises();

        expect(manager!.data.value?.name).toEqual('by-id');
        expect(httpClient.requests.filter((request) => request.method === 'GET')).toHaveLength(1);
        expect(wrapper.emitted('resolved')).toHaveLength(1);
    });

    it('falls back to the query when the id read fails', async () => {
        let manager : EntityManager<Role> | undefined;
        mountKitComponent(
            createRecord((value) => { manager = value; }),
            {},
            {
                'GET /roles/:id': () => { throw new Error('not found'); },
                'GET /roles': () => ({ data: [buildRole('role-2', 'by-query')], meta: { total: 1 } }),
            },
        );

        await manager!.resolve({ id: 'role-1', query: { filters: { name: 'by-query' } } });

        expect(manager!.data.value?.name).toEqual('by-query');
    });

    it('prefers props.entity and fetches nothing', async () => {
        let manager : EntityManager<Role> | undefined;
        const { wrapper, httpClient } = mountKitComponent(
            createRecord((value) => { manager = value; }),
            { entity: buildRole('role-3', 'from-props'), entityId: 'role-1' },
        );

        await manager!.resolve({ id: 'role-1' });

        expect(manager!.data.value?.name).toEqual('from-props');
        expect(httpClient.requests.filter((request) => request.method === 'GET' && request.url.includes('/roles'))).toHaveLength(0);
        expect(wrapper.emitted('resolved')).toHaveLength(1);
    });

    it('rejects resolveOrFail with the read error when nothing resolved', async () => {
        let manager : EntityManager<Role> | undefined;
        mountKitComponent(
            createRecord((value) => { manager = value; }),
            {},
            { 'GET /roles/:id': () => { throw new Error('not found'); } },
        );

        await expect(manager!.resolveOrFail({ id: 'role-1' })).rejects.toBeInstanceOf(Error);
        expect(manager!.error.value).toBeDefined();
    });
});
