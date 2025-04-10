/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { Client, ClientHookTokenRefresher, ClientHokenTokenRefresherEventName } from '@authup/core-http-kit';
import type { App } from 'vue';
import { storeToRefs } from 'pinia';
import { hasHTTPClientTokenRefresher, provideHTTPClientTokenRefresher } from './singleton';
import { injectStoreFactory } from '../../store';
import type { HTTPClientTokenRefresherInstallOptions } from './types';

export function installHTTPClientHookTokenRefresher(
    app: App,
    options: HTTPClientTokenRefresherInstallOptions = {},
) {
    if (hasHTTPClientTokenRefresher(app)) {
        return;
    }

    const storeFactory = injectStoreFactory(app);
    const store = storeFactory(options.pinia);

    const { refreshToken } = storeToRefs(store);

    const hook = new ClientHookTokenRefresher({
        baseURL: options.baseURL,
        tokenCreator: () => {
            if (!refreshToken.value) {
                throw new Error('No refresh token available.');
            }

            const client = new Client({ baseURL: options.baseURL });
            return client.token.createWithRefreshToken({
                refresh_token: refreshToken.value,
            });
        },
        timer: !options.isServer,
    });

    hook.on(ClientHokenTokenRefresherEventName.REFRESH_FINISHED, (response) => {
        store.applyTokenGrantResponse(response);
    });

    hook.on(ClientHokenTokenRefresherEventName.REFRESH_FAILED, () => {
        Promise.resolve()
            .then(() => store.logout());
    });

    provideHTTPClientTokenRefresher(hook);
}
