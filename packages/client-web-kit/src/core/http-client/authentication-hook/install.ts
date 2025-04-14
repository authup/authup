/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { Client, ClientAuthenticationHook, ClientAuthenticationHookEventName } from '@authup/core-http-kit';
import type { App } from 'vue';
import { storeToRefs } from 'pinia';
import { hasHTTPClientAuthenticationHook, provideHTTPClientAuthenticationHook } from './singleton';
import { StoreDispatcherEventName, injectStoreDispatcher, injectStoreFactory } from '../../store';
import type { HTTPClientAuthenticationHookInstallOptions } from './types';

export function installHTTPClientAuthenticationHook(
    app: App,
    options: HTTPClientAuthenticationHookInstallOptions = {},
) {
    if (hasHTTPClientAuthenticationHook(app)) {
        return;
    }

    const storeFactory = injectStoreFactory(app);
    const store = storeFactory(options.pinia);

    const { refreshToken } = storeToRefs(store);

    const hook = new ClientAuthenticationHook({
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

    hook.on(ClientAuthenticationHookEventName.REFRESH_FINISHED, (response) => {
        store.applyTokenGrantResponse(response);
    });

    let isSelfCallee = false;

    hook.on(ClientAuthenticationHookEventName.HEADER_UNSET, () => {
        if (!isSelfCallee) {
            Promise.resolve()
                .then(() => store.logout());
        }
    });

    const storeDispatcher = injectStoreDispatcher(app);

    const handleAccessTokenEvent = () => {
        isSelfCallee = true;

        if (store.accessToken) {
            hook.enable();
            hook.setAuthorizationHeader({
                type: 'Bearer',
                token: store.accessToken as string,
            });
        } else {
            hook.disable();
            hook.unsetAuthorizationHeader();
        }

        isSelfCallee = false;
    };

    const handleAccessTokenExpireDateEvent = () => {
        if (store.accessTokenExpireDate) {
            const expiresIn = Math.floor((store.accessTokenExpireDate.getTime() - Date.now()) / 1000);
            hook.setTimer(expiresIn);
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

    provideHTTPClientAuthenticationHook(hook, app);
}
