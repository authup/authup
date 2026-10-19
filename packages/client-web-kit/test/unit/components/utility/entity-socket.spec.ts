/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildEntityNamespaceName } from '@authup/core-kit';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, provide } from 'vue';
import { defineEntitySocketManager } from '../../../../src/components/utility/entity';
import { SocketClientSymbol } from '../../../../src/core/socket-manager';
import { mountKitComponent } from '../../../utils';

function mountSocketConsumer(realmId?: string) {
    const namespaces : string[] = [];
    const socket = {
        emit: () => undefined,
        on: () => undefined,
        off: () => undefined,
    };

    const Consumer = defineComponent({
        setup() {
            defineEntitySocketManager({
                type: 'role',
                realmId,
                onCreated: () => undefined,
            });

            return () => null;
        },
    });

    const Host = defineComponent({
        setup() {
            provide(SocketClientSymbol, {
                connect: async (namespace: string) => {
                    namespaces.push(namespace);
                    return socket;
                },
            });

            return () => h(Consumer);
        },
    });

    mountKitComponent(Host);

    return namespaces;
}

describe('defineEntitySocketManager', () => {
    it('should connect to the namespace the server publishes the realm to', async () => {
        const namespaces = mountSocketConsumer('realm-id');
        await flushPromises();

        expect(namespaces).toEqual([buildEntityNamespaceName('realm-id')]);
    });

    it('should connect to the default namespace without a realm', async () => {
        const namespaces = mountSocketConsumer();
        await flushPromises();

        expect(namespaces).toEqual(['/']);
    });
});
