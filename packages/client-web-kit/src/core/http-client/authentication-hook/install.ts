/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { Client, ClientAuthenticationHook, ClientAuthenticationHookEventName } from '@authup/core-http-kit';
import type { App } from 'vue';
import { unref } from 'vue';
import { storeToRefs } from 'pinia';
import { hasHTTPClientAuthenticationHook, provideHTTPClientAuthenticationHook } from './singleton';
import { StoreDispatcherEventName, injectStoreDispatcher, injectStoreFactory } from '../../store';
import type { HTTPClientAuthenticationHookInstallOptions } from './types';

// Pinia 3 / Vue 3.5 typing quirk — store property access through the
// Pinia proxy + `storeToRefs` returns one level of ref-wrapping more
// than the runtime actually unwraps. `unref()` collapses the extra
// layer at the call site; runtime behaviour is unchanged because
// Pinia's proxy already auto-unwraps at the property access. Surfaced
// when @vueuse/integrations 14.x + Vue 3.5's `Ref<T, S>` interaction
// landed in this branch's foundation commit.

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
            const token = unref(refreshToken.value) as string | null;
            if (!token) {
                throw new Error('No refresh token available.');
            }

            const client = new Client({ baseURL: options.baseURL });
            return client.token.createWithRefreshToken({ refresh_token: token });
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

        const accessToken = unref(store.accessToken) as string | null;
        if (accessToken) {
            hook.enable();
            hook.setAuthorizationHeader({
                type: 'Bearer',
                token: accessToken,
            });
        } else {
            hook.disable();
            hook.unsetAuthorizationHeader();
        }

        isSelfCallee = false;
    };

    const handleAccessTokenExpireDateEvent = () => {
        const expireDate = unref(store.accessTokenExpireDate) as Date | null;
        if (expireDate) {
            const expiresIn = Math.floor((expireDate.getTime() - Date.now()) / 1000);
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
