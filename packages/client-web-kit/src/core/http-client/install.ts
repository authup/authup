/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Client,
    getClientErrorCode,
    unsetHeader,
} from '@authup/core-http-kit';
import type { App } from 'vue';
import { isJWKErrorCode } from '@authup/specs';
import { StoreDispatcherEventName, injectStoreDispatcher, injectStoreFactory } from '../store';
import { hasHTTPClient, provideHTTPClient } from './singleton';
import type { HTTPClientInstallOptions } from './types';
import { injectHTTPClientTokenRefresher } from './token-refresher';

export function installHTTPClient(app: App, options: HTTPClientInstallOptions = {}) {
    if (hasHTTPClient(app)) {
        return;
    }

    const client = new Client({ baseURL: options.baseURL });

    const storeFactory = injectStoreFactory(app);
    const store = storeFactory(options.pinia);

    client.on('responseError', (err) => {
        const { request } = err;

        const code = getClientErrorCode(err);
        if (isJWKErrorCode(code)) {
            return store.logout()
                .then(() => {
                    if (request.headers) {
                        unsetHeader(request.headers, 'authorization');

                        return client.request(request);
                    }

                    return Promise.reject(err);
                });
        }

        return Promise.reject(err);
    });

    const tokenRefresher = injectHTTPClientTokenRefresher(app);
    const storeDispatcher = injectStoreDispatcher(app);

    const handleAccessTokenEvent = () => {
        if (store.accessToken) {
            // todo: is better to enable/disable :)
            // todo: better than unmount and mount always.
            tokenRefresher.attach(client);
            tokenRefresher.call((c) => c.setAuthorizationHeader({
                type: 'Bearer',
                token: store.accessToken as string,
            }))

        } else {
            tokenRefresher.call((c) => c.unsetAuthorizationHeader());
            tokenRefresher.detach(client);
        }
    };

    const handleAccessTokenExpireDateEvent = () => {
        if (store.accessTokenExpireDate) {
            const expiresIn = Math.floor((store.accessTokenExpireDate.getTime() - Date.now()) / 1000);
            tokenRefresher.setTimer(expiresIn);
        }
    };

    storeDispatcher.on(
        StoreDispatcherEventName.ACCESS_TOKEN_UPDATED,
        () => handleAccessTokenEvent(),
    );

    storeDispatcher.on(
        StoreDispatcherEventName.ACCESS_TOKEN_EXPIRE_DATE_UPDATED,
        () => handleAccessTokenExpireDateEvent(),
    );

    handleAccessTokenEvent();
    handleAccessTokenExpireDateEvent();

    provideHTTPClient(client, app);
}
