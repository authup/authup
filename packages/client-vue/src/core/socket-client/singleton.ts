/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App } from 'vue';
import { inject, provide } from 'vue';
import type { SocketClient } from './module';

export const SocketClientSymbol = Symbol.for('AuthupSocketClient');

export function provideSocketClient(manager: SocketClient, instance?: App) {
    if (instance) {
        instance.provide(SocketClientSymbol, manager);
        return;
    }
    provide(SocketClientSymbol, manager);
}

export function hasSocketClient() {
    const manager = inject(SocketClientSymbol);
    return !!manager;
}

export function injectSocketClient() : SocketClient {
    const manager = inject(SocketClientSymbol);
    if (!manager) {
        throw new Error('The Socket Client is not provided.');
    }

    return manager as SocketClient;
}
