/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client, ClientResponseErrorTokenHook } from '@authup/core-http-kit';
import { storeToRefs } from 'pinia';
import type { App } from 'vue';
import { STORE_ID, injectStore } from '../store';
import { hasHTTPClient, provideHTTPClient } from './singleton';
import type { HTTPClientInstallOptions } from './types';

export function installHTTPClient(app: App, options: HTTPClientInstallOptions = {}) {
    if (hasHTTPClient(app)) {
        return;
    }

    const client = new Client({ baseURL: options.baseURL });

    const storeCreator = injectStore(app);
    const store = storeCreator();

    const { refreshToken } = storeToRefs(store);

    const tokenHook = new ClientResponseErrorTokenHook(client, {
        baseURL: options.baseURL,
        tokenCreator: () => {
            if (!refreshToken.value) {
                throw new Error('No refresh token available.');
            }

            return client.token.createWithRefreshToken({
                refresh_token: refreshToken.value,
            });
        },
        tokenCreated: (response) => {
            store.setAccessTokenExpireDate(undefined);

            setTimeout(() => {
                store.handleTokenGrantResponse(response);
            }, 0);
        },
        tokenFailed: () => {
            store.logout();
        },
    });

    store.$subscribe((
        mutation,
        state,
    ) => {
        if (mutation.storeId !== STORE_ID) return;

        if (state.accessToken) {
            client.setAuthorizationHeader({
                type: 'Bearer',
                token: state.accessToken,
            });

            tokenHook.mount();
        } else {
            client.unsetAuthorizationHeader();

            tokenHook.unmount();
        }

        if (
            state.refreshToken &&
            state.accessTokenExpireDate
        ) {
            const expiresIn = Math.floor((state.accessTokenExpireDate.getTime() - Date.now()) / 1000);

            tokenHook.setTimer({
                refresh_token: state.refreshToken,
                expires_in: expiresIn,
            });
        }
    });

    provideHTTPClient(client, app);
}
