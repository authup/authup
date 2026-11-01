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
import { defineComponent, h, ref } from 'vue';
import type { Ref } from 'vue';
import type { EntityManager } from '../../../../src/components/utility';
import {
    defineEntityManager,
    defineEntityVEmitOptions,
    defineEntityVProps,
} from '../../../../src/components/utility';
import { mountKitComponent } from '../../../utils';

function createRecord(
    capture: (manager: EntityManager<Role>) => void,
    query?: Ref<string>,
) {
    return defineComponent({
        props: defineEntityVProps<Role>(),
        emits: defineEntityVEmitOptions<Role>(),
        setup(props, setup) {
            const manager = defineEntityManager({
                type: 'role',
                props,
                setup,
                socket: false,
                ...(query ? { query: () => ({ filters: { name: query.value } }) } : {}),
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
        const { wrapper } = mountKitComponent(createRecord((value) => {
            manager = value; 
        }));

        manager!.data.value = buildRole('role-1', 'admin');
        await flushPromises();

        expect(manager!.data.value?.id).toEqual('role-1');
        expect(wrapper.text()).toEqual('admin');

        manager!.data.value = undefined;
        await flushPromises();

        expect(manager!.data.value).toBeUndefined();
        expect(wrapper.text()).toEqual('none');
    });

    it('re-renders an in-place write to the held record', async () => {
        let manager : EntityManager<Role> | undefined;
        const { wrapper } = mountKitComponent(createRecord((value) => {
            manager = value; 
        }));

        manager!.data.value = buildRole('role-1', 'admin');
        await flushPromises();
        expect(wrapper.text()).toEqual('admin');

        manager!.data.value!.name = 'renamed';
        await flushPromises();

        expect(wrapper.text()).toEqual('renamed');
    });

    it('drops a second create while the first is in flight', async () => {
        const { promise: gate, resolve: release } = Promise.withResolvers<void>();

        let manager : EntityManager<Role> | undefined;
        const { wrapper, httpClient } = mountKitComponent(
            createRecord((value) => {
                manager = value; 
            }),
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
            createRecord((value) => {
                manager = value; 
            }),
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
            createRecord((value) => {
                manager = value; 
            }),
            {},
            {
                'GET /roles/:id': () => {
                    throw new Error('not found'); 
                },
                'GET /roles': () => ({ data: [buildRole('role-2', 'by-query')], meta: { total: 1 } }),
            },
        );

        await manager!.resolve({ id: 'role-1', query: { filters: { name: 'by-query' } } });

        expect(manager!.data.value?.name).toEqual('by-query');
    });

    it('prefers props.entity and fetches nothing', async () => {
        let manager : EntityManager<Role> | undefined;
        const { wrapper, httpClient } = mountKitComponent(
            createRecord((value) => {
                manager = value; 
            }),
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
            createRecord((value) => {
                manager = value; 
            }),
            {},
            {
                'GET /roles/:id': () => {
                    throw new Error('not found'); 
                }, 
            },
        );

        await expect(manager!.resolveOrFail({ id: 'role-1' })).rejects.toBeInstanceOf(Error);
        expect(manager!.error.value).toBeDefined();
    });

    it('emits the record an update produced while a load is in flight', async () => {
        const { promise: gate, resolve: release } = Promise.withResolvers<void>();

        let manager : EntityManager<Role> | undefined;
        const { wrapper } = mountKitComponent(
            createRecord((value) => {
                manager = value; 
            }),
            {},
            {
                'GET /roles/:id': async (request: FakeRequest) => {
                    await gate;

                    return { data: buildRole(request.params.id, 'loaded'), meta: {} };
                },
            },
        );

        const loading = manager!.resolve({ id: 'role-1' });

        await flushPromises();

        // Both writes land while the read is in flight, so the source
        // buffers them; the bridge and the emit still answer what was written.
        manager!.data.value = buildRole('role-1', 'held');
        expect(manager!.data.value?.name).toEqual('held');

        manager!.updated({ name: 'renamed' } as Role);

        const emitted = wrapper.emitted('updated')!;

        expect(emitted[0][0]).toEqual({ id: 'role-1', name: 'renamed' });
        expect(manager!.data.value?.name).toEqual('renamed');

        release();
        await loading;
        await flushPromises();

        expect(manager!.data.value?.name).toEqual('renamed');
    });

    it('clears the held record while a changed query reloads', async () => {
        const gates : Array<() => void> = [];
        const name = ref('first');

        let manager : EntityManager<Role> | undefined;

        mountKitComponent(
            createRecord((value) => {
                manager = value; 
            }, name),
            {},
            {
                'GET /roles': async (request: FakeRequest) => {
                    const url = new URL(request.url, 'http://fake.test');
                    const filter = url.searchParams.get('filter') ?? '';

                    if (filter.includes('second')) {
                        const { promise, resolve } = Promise.withResolvers<void>();

                        gates.push(resolve);
                        await promise;

                        return { data: [buildRole('role-2', 'second')], meta: { total: 1 } };
                    }

                    return { data: [buildRole('role-1', 'first')], meta: { total: 1 } };
                },
            },
        );

        await manager!.resolve({ query: { filters: { name: 'first' } } });
        expect(manager!.data.value?.id).toEqual('role-1');

        name.value = 'second';
        await flushPromises();

        expect(gates).toHaveLength(1);
        expect(manager!.data.value).toBeUndefined();

        const resolving = manager!.resolve();

        gates[0]();
        await resolving;

        expect(manager!.data.value?.id).toEqual('role-2');
    });
});
