/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App } from 'vue';
import type { ClientHookTokenRefresher } from '@authup/core-http-kit';
import { inject } from '../../inject';
import { provide } from '../../provide';

const sym = Symbol.for('AuthupHTTPClientHookTokenRefresher');

export function injectHTTPClientTokenRefresher(app?: App) : ClientHookTokenRefresher {
    const instance = inject<ClientHookTokenRefresher>(sym, app);
    if (!instance) {
        throw new Error('The http client token refresher has not been injected in the app context.');
    }

    return instance;
}

export function hasHTTPClientTokenRefresher(app?: App) : boolean {
    return !!injectHTTPClientTokenRefresher(app);
}

export function provideHTTPClientTokenRefresher(
    refresher: ClientHookTokenRefresher,
    app?: App,
) {
    provide(sym, refresher, app);
}
