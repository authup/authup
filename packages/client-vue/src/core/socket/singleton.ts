/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App } from 'vue';
import { inject, provide } from 'vue';
import type { SocketManager } from './module';

const SocketSymbol = Symbol.for('Socket');

export function provideSocketManager(manager: SocketManager, instance?: App) {
    if (instance) {
        instance.provide(SocketSymbol, manager);
        return;
    }
    provide(SocketSymbol, manager);
}

export function hasSocketManager() {
    const manager = inject(SocketSymbol);
    return !!manager;
}

export function injectSocketManager() : SocketManager {
    const manager = inject(SocketSymbol);
    if (!manager) {
        throw new Error('The Socket Manager is not provided.');
    }

    return manager as SocketManager;
}
