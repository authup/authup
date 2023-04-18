/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    APIClient,
    mountClientResponseErrorTokenHook,
    unmountClientResponseErrorTokenHook,
} from '@authup/core';
import type { ClientAPIConfigInput } from '@authup/core';
import type { Pinia } from 'pinia';
import { storeToRefs } from 'pinia';
import { useRuntimeConfig } from '#imports';
import { defineNuxtPlugin } from '#app';
import { useAuthStore } from '../store/auth';

declare module '#app' {
    interface NuxtApp {
        $api: APIClient;
    }
}

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $api: APIClient;
    }
}

export default defineNuxtPlugin((ctx) => {
    const runtimeConfig = useRuntimeConfig();

    const config : ClientAPIConfigInput = {
        baseURL: runtimeConfig.public.apiUrl,
    };

    const client = new APIClient(config);
    const store = useAuthStore(ctx.$pinia as Pinia);
    store.$subscribe((mutation, state) => {
        if (mutation.storeId !== 'auth') return;

        if (state.accessToken) {
            client.setAuthorizationHeader({
                type: 'Bearer',
                token: state.accessToken,
            });

            mountClientResponseErrorTokenHook(client, {
                baseURL: runtimeConfig.public.apiUrl,
                tokenCreator: () => {
                    let refreshToken : string | undefined;
                    if (state.refreshToken) {
                        refreshToken = state.refreshToken;
                    }
                    if (refreshToken) {
                        const refs = storeToRefs(store);
                        refreshToken = refs.refreshToken.value;
                    }

                    return client.token.createWithRefreshToken({
                        refresh_token: refreshToken as string,
                    });
                },
            });
        } else {
            client.unsetAuthorizationHeader();
            unmountClientResponseErrorTokenHook(client);
        }
    });

    ctx.provide('api', client);
});
