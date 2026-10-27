/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityDefaultEventName, buildEntityChannelName } from '@authup/core-kit';
import type { Role } from '@authup/core-kit';
import { buildEventFullName } from '@authup/core-realtime-kit';
import type { FakeRequest } from '@authup/core-http-kit/testing';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, provide } from 'vue';
import type { EntityCollectionManager } from '../../../../src/components/utility';
import {
    defineEntityCollectionManager,
    defineEntityCollectionVEmitOptions,
    defineEntityCollectionVProps,
} from '../../../../src/components/utility';
import { SocketClientSymbol } from '../../../../src/core/socket-manager';
import { mountKitComponent } from '../../../utils';

type SocketListener = (event: unknown) => void;

function createCollection(
    capture: (manager: EntityCollectionManager<Role>) => void,
    options: { loadAll?: boolean } = {},
) {
    return defineComponent({
        props: defineEntityCollectionVProps<Role>(),
        emits: defineEntityCollectionVEmitOptions<Role>(),
        setup(props, setup) {
            const manager = defineEntityCollectionManager<'role'>({
                type: 'role',
                props,
                setup,
                loadAll: options.loadAll,
            });
            capture(manager);

            return () => manager.render();
        },
    });
}

function respond(rows: Partial<Role>[]) {
    return {
        data: rows,
        meta: {
            total: rows.length,
            limit: 10,
            offset: 0,
        },
    };
}

function servePages(pages: (offset: number) => Partial<Role>[], total: number, offsets: number[]) {
    return (req: FakeRequest) => {
        const url = new URL(req.url, 'http://fake.test');
        const limit = Number(url.searchParams.get('page[limit]') ?? 10);
        const offset = Number(url.searchParams.get('page[offset]') ?? 0);
        offsets.push(offset);

        return {
            data: pages(offset),
            meta: {
                total, 
                limit, 
                offset, 
            },
        };
    };
}

function rangeOfRoles(from: number, to: number) : Partial<Role>[] {
    const rows : Partial<Role>[] = [];
    for (let i = from; i < to; i++) {
        rows.push({ id: `role-${i}`, name: `role-${i}` });
    }

    return rows;
}

describe('defineEntityCollectionManager (data source)', () => {
    it('a loadAll refresh walks from the first page again', async () => {
        let manager : EntityCollectionManager<Role> | undefined;
        const offsets : number[] = [];

        const { wrapper } = mountKitComponent(
            createCollection((value) => { manager = value; }, { loadAll: true }),
            { loadOnSetup: false },
            {
                'GET /roles': servePages(
                    (offset) => rangeOfRoles(offset, Math.min(offset + 10, 25)),
                    25,
                    offsets,
                ),
            },
        );

        await (wrapper.vm as any).load();
        await flushPromises();
        expect(manager?.data.value).toHaveLength(25);

        offsets.length = 0;
        await (wrapper.vm as any).load({ sorts: { name: 'ASC' } });
        await flushPromises();

        expect(offsets[0]).toEqual(0);
        expect(manager?.data.value).toHaveLength(25);
        expect(manager?.meta.value.pagination?.offset).toEqual(0);
    });

    it('a loadAll walk drops a row a shifted page repeats', async () => {
        let manager : EntityCollectionManager<Role> | undefined;
        const offsets : number[] = [];

        const { wrapper } = mountKitComponent(
            createCollection((value) => { manager = value; }, { loadAll: true }),
            { loadOnSetup: false },
            {
                // A row inserted between the two requests shifts the second
                // page back by one, so it repeats role-9.
                'GET /roles': servePages(
                    (offset) => (offset === 0 ? rangeOfRoles(0, 10) : rangeOfRoles(9, 19)),
                    20,
                    offsets,
                ),
            },
        );

        await (wrapper.vm as any).load();
        await flushPromises();

        expect(manager?.data.value.map((row) => row.id)).toEqual(
            rangeOfRoles(0, 19).map((row) => row.id),
        );
    });

    it('a load issued while another is in flight supersedes it', async () => {
        let manager : EntityCollectionManager<Role> | undefined;

        const { promise: blocked, resolve: release } = Promise.withResolvers<void>();

        const { wrapper } = mountKitComponent(
            createCollection((value) => { manager = value; }),
            { loadOnSetup: false },
            {
                'GET /roles': async (req: FakeRequest) => {
                    const url = new URL(req.url, 'http://fake.test');
                    if (url.searchParams.get('page[offset]') === '20') {
                        await blocked;
                        return respond([{ id: 'stale', name: 'stale' }]);
                    }

                    return respond([{ id: 'latest', name: 'latest' }]);
                },
            },
        );

        const first = (wrapper.vm as any).load({ pagination: { offset: 20 } });
        await flushPromises();
        const second = (wrapper.vm as any).load({ pagination: { offset: 0 } });
        await flushPromises();

        expect(manager?.busy.value).toBe(true);

        release();
        await Promise.all([first, second]);
        await flushPromises();

        expect(manager?.busy.value).toBe(false);
        expect(manager?.data.value.map((row) => row.id)).toEqual(['latest']);
        expect(manager?.meta.value.pagination?.offset).toEqual(0);
    });

    it('a socket insert adjusts the total', async () => {
        let manager : EntityCollectionManager<Role> | undefined;
        const listeners : Record<string, SocketListener> = {};

        const socket = {
            emit: () => undefined,
            on: (event: string, listener: SocketListener) => {
                listeners[event] = listener;
            },
            off: () => undefined,
        };

        const Collection = createCollection((value) => { manager = value; });
        const Host = defineComponent({
            setup() {
                provide(SocketClientSymbol, { connect: async () => socket });

                return () => h(Collection);
            },
        });

        mountKitComponent(Host, {}, { 'GET /roles': () => respond([{ id: 'role-1', name: 'admin' }]) });
        await flushPromises();

        expect(manager?.total.value).toEqual(1);

        const created = listeners[buildEventFullName('role', EntityDefaultEventName.CREATED)];
        expect(created).toBeDefined();

        const event = {
            data: { id: 'role-2', name: 'member' },
            meta: { roomName: buildEntityChannelName('role') },
        };

        created(event);
        // a replayed event inserts nothing and leaves the total alone
        created(event);

        expect(manager?.data.value.map((row) => row.id)).toEqual(['role-1', 'role-2']);
        expect(manager?.total.value).toEqual(2);
        expect(manager?.meta.value.total).toEqual(2);
    });
});
