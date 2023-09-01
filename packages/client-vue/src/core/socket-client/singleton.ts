/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App } from 'vue';
import { hasInjectionContext, inject } from 'vue';
import type { SocketClient } from './module';

export const SocketClientSymbol = Symbol.for('AuthupSocketClient');

export function provideSocketClient(app: App, manager: SocketClient) {
    if (
        app._context &&
        app._context.provides &&
        app._context.provides[SocketClientSymbol]
    ) {
        return;
    }

    app.provide(SocketClientSymbol, manager);
}

export function hasSocketClient() {
    if (!hasInjectionContext()) {
        return false;
    }

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
