/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-http-kit';
import type { App } from 'vue';
import { inject } from '../inject';
import { provide } from '../provide';

export const HTTPClientSymbol = Symbol.for('AuthupHTTPClient');

export function provideHTTPClient(client: Client, app?: App) {
    provide(HTTPClientSymbol, client, app);
}

export function hasHTTPClient(app?: App) : boolean {
    try {
        return !!injectHTTPClient(app);
    } catch (e) {
        return false;
    }
}

export function injectHTTPClient(app?: App) {
    const instance = inject<Client>(HTTPClientSymbol, app);
    if (!instance) {
        throw new Error('The api client has not been injected.');
    }

    return instance;
}
