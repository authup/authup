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

function createCollection(capture: (manager: EntityCollectionManager<Role>) => void) {
    return defineComponent({
        props: defineEntityCollectionVProps<Role>(),
        emits: defineEntityCollectionVEmitOptions<Role>(),
        setup(props, setup) {
            const manager = defineEntityCollectionManager<'role'>({
                type: 'role',
                props,
                setup,
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

describe('defineEntityCollectionManager (data source)', () => {
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
