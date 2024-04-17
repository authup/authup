/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App } from 'vue';
import { hasInjectionContext, inject, provide } from 'vue';
import type { SocketClient } from './module';

export const SocketClientSymbol = Symbol.for('AuthupSocketClient');

export function isSocketClientInjected() {
    if (!hasInjectionContext()) {
        return false;
    }

    const instance = inject(SocketClientSymbol);
    return !!instance;
}

export function provideSocketClient(manager: SocketClient, app?: App) {
    if (typeof app === 'undefined') {
        if (isSocketClientInjected()) {
            return;
        }

        provide(SocketClientSymbol, manager);
        return;
    }

    if (
        app._context &&
        app._context.provides &&
        app._context.provides[SocketClientSymbol]
    ) {
        return;
    }

    app.provide(SocketClientSymbol, manager);
}

export function injectSocketClient() : SocketClient {
    const manager = inject(SocketClientSymbol);
    if (!manager) {
        throw new Error('The Socket Client is not provided.');
    }

    return manager as SocketClient;
}
