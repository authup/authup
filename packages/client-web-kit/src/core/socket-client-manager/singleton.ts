/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientManager } from '@authup/core-socket-kit';
import type { App } from 'vue';
import { hasInjectionContext } from 'vue';
import { inject } from '../inject';
import { provide } from '../provide';

export const SocketClientSymbol = Symbol.for('AuthupSocketClientManager');

export function isSocketClientManagerInjected() {
    if (!hasInjectionContext()) {
        return false;
    }

    const instance = inject(SocketClientSymbol);
    return !!instance;
}

export function provideSocketClientManager(manager: ClientManager, app?: App) {
    provide(SocketClientSymbol, manager, app);
}

export function injectSocketClientManager() : ClientManager {
    const manager = inject<ClientManager>(SocketClientSymbol);
    if (!manager) {
        throw new Error('The socket client manager has not been injected in the app context.');
    }

    return manager;
}
