/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientAPIConfigInput, TokenCreator } from '@authup/core';
import {
    APIClient,
    mountClientResponseErrorTokenHook,
    unmountClientResponseErrorTokenHook,
} from '@authup/core';
import type { Pinia } from 'pinia';
import { storeToRefs } from 'pinia';
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
    const config : ClientAPIConfigInput = {
        baseURL: ctx.$config.public.apiUrl,
    };
    const client = new APIClient(config);

    const tokenCreator : TokenCreator = async () => {
        const store = useAuthStore();
        const { refreshToken } = storeToRefs(store);

        if (!refreshToken.value) {
            throw new Error('No refresh token available.');
        }

        return client.token.createWithRefreshToken({
            refresh_token: refreshToken.value,
        });
    };

    const store = useAuthStore(ctx.$pinia as Pinia);
    store.$subscribe((mutation, state) => {
        if (mutation.storeId !== 'auth') return;

        if (state.accessToken) {
            client.setAuthorizationHeader({
                type: 'Bearer',
                token: state.accessToken,
            });

            mountClientResponseErrorTokenHook(client, {
                baseURL: ctx.$config.public.apiUrl,
                tokenCreator,
                tokenCreated: (response) => {
                    store.setAccessTokenExpireDate(undefined);

                    setTimeout(() => {
                        store.handleTokenGrantResponse(response);
                    }, 0);
                },
                tokenFailed: (e) => {
                    store.logout();
                },
            });
        } else {
            client.unsetAuthorizationHeader();
            unmountClientResponseErrorTokenHook(client);
        }
    });

    ctx.provide('api', client);
});
