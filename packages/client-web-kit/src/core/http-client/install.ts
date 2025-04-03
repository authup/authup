/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Client,
    ClientResponseErrorTokenHook,
    ClientResponseTokenHookEventName,
    getClientErrorCode,
    unsetHeader,
} from '@authup/core-http-kit';
import { storeToRefs } from 'pinia';
import type { App } from 'vue';
import { isJWKErrorCode } from '@authup/specs';
import { StoreDispatcherEventName, injectStoreDispatcher, injectStoreFactory } from '../store';
import { hasHTTPClient, provideHTTPClient } from './singleton';
import type { HTTPClientInstallOptions } from './types';

export function installHTTPClient(app: App, options: HTTPClientInstallOptions = {}) {
    if (hasHTTPClient(app)) {
        return;
    }

    const client = new Client({ baseURL: options.baseURL });

    const storeFactory = injectStoreFactory(app);
    const store = storeFactory(options.pinia);

    const { refreshToken } = storeToRefs(store);

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

    const tokenHook = new ClientResponseErrorTokenHook({
        baseURL: options.baseURL,
        tokenCreator: () => {
            if (!refreshToken.value) {
                throw new Error('No refresh token available.');
            }

            return client.token.createWithRefreshToken({
                refresh_token: refreshToken.value,
            });
        },
        timer: !options.isServer,
    });

    tokenHook.on(ClientResponseTokenHookEventName.REFRESH_FINISHED, (response) => {
        store.applyTokenGrantResponse(response);
    });

    tokenHook.on(ClientResponseTokenHookEventName.REFRESH_FAILED, () => {
        Promise.resolve()
            .then(() => store.logout());
    });

    const storeDispatcher = injectStoreDispatcher(app);
    const handleAccessTokenEvent = () => {
        if (store.accessToken) {
            client.setAuthorizationHeader({
                type: 'Bearer',
                token: store.accessToken,
            });

            tokenHook.mount(client);
        } else {
            client.unsetAuthorizationHeader();
            tokenHook.unmount(client);
        }
    };

    const handleAccessTokenExpireDateEvent = () => {
        if (store.accessTokenExpireDate) {
            const expiresIn = Math.floor((store.accessTokenExpireDate.getTime() - Date.now()) / 1000);
            tokenHook.setTimer(expiresIn);
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
