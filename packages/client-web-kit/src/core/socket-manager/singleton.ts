/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App } from 'vue';
import type { ClientManager } from '@authup/core-realtime-kit';
import { inject } from '../inject';
import { provide } from '../provide';

export const SocketClientSymbol = Symbol.for('AuthupSocketManager');

export function isSocketManagerUsable() {
    return !!inject(SocketClientSymbol);
}

export function provideSocketManager(manager: ClientManager, app?: App) {
    provide(SocketClientSymbol, manager, app);
}

export function injectSocketManager(app?: App) : ClientManager {
    const manager = inject<ClientManager>(SocketClientSymbol, app);
    if (!manager) {
        throw new Error('The socket manager has not been injected in the app context.');
    }

    return manager;
}
