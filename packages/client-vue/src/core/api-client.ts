/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { APIClient } from '@authup/core';
import type { App } from 'vue';
import { inject, provide } from 'vue';

export const APIClientSymbol = Symbol.for('AuthupAPIClient');

export function provideAPIClient(client: APIClient, instance?: App) {
    if (instance) {
        instance.provide(APIClientSymbol, client);
        return;
    }

    provide(APIClientSymbol, client);
}

export function injectAPIClient() {
    const instance = inject(APIClientSymbol);
    if (!instance) {
        throw new Error('The APIClient is not set.');
    }

    return instance as APIClient;
}
