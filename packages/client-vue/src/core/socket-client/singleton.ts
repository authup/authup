/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App } from 'vue';
import { inject, provide } from 'vue';
import type { SocketClient } from './module';

export const SocketManagerSymbol = Symbol.for('AuthupSocketManager');

export function provideSocketManager(manager: SocketClient, instance?: App) {
    if (instance) {
        instance.provide(SocketManagerSymbol, manager);
        return;
    }
    provide(SocketManagerSymbol, manager);
}

export function hasSocketManager() {
    const manager = inject(SocketManagerSymbol);
    return !!manager;
}

export function injectSocketManager() : SocketClient {
    const manager = inject(SocketManagerSymbol);
    if (!manager) {
        throw new Error('The Socket Manager is not provided.');
    }

    return manager as SocketClient;
}
