/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App } from 'vue';
import type { ClientAuthenticationHook } from '@authup/core-http-kit';
import { inject } from '../../inject';
import { provide } from '../../provide';

const sym = Symbol.for('AuthupHTTPClientAuthenticationHook');

export function injectHTTPClientAuthenticationHook(app?: App) : ClientAuthenticationHook {
    const instance = inject<ClientAuthenticationHook>(sym, app);
    if (!instance) {
        throw new Error('The http client authentication hook has not been injected in the app context.');
    }

    return instance;
}

export function hasHTTPClientAuthenticationHook(app?: App) : boolean {
    try {
        return !!injectHTTPClientAuthenticationHook(app);
    } catch (e) {
        return false;
    }
}

export function provideHTTPClientAuthenticationHook(
    refresher: ClientAuthenticationHook,
    app?: App,
) {
    provide(sym, refresher, app);
}
