/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App } from 'vue';
import { buildHTTPClient } from './build';
import { hasHTTPClient, provideHTTPClient } from './singleton';
import type { HTTPClientInstallOptions } from './types';
import { injectHTTPClientAuthenticationHook } from './authentication-hook';

export function installHTTPClient(app: App, options: HTTPClientInstallOptions = {}) {
    if (hasHTTPClient(app)) {
        return;
    }

    const client = buildHTTPClient(options);

    const authenticationHook = injectHTTPClientAuthenticationHook(app);
    authenticationHook.attach(client);

    provideHTTPClient(client, app);
}
