/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientAPIConfigInput } from '@authup/core';
import {
    APIClient,
    ClientResponseErrorTokenHook,
} from '@authup/core';
import type { Pinia } from 'pinia';
import { storeToRefs } from 'pinia';
import { defineNuxtPlugin, useRuntimeConfig } from '#app';
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

    const { apiUrl: baseURL } = runtimeConfig.public;

    const config : ClientAPIConfigInput = {
        baseURL,
    };
    const client = new APIClient(config);

    const store = useAuthStore(ctx.$pinia as Pinia);

    const tokenHook = new ClientResponseErrorTokenHook(client, {
        baseURL,
        tokenCreator: () => {
            const { refreshToken } = storeToRefs(store);

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

    store.$subscribe((mutation, state) => {
        if (mutation.storeId !== 'auth') return;

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

    ctx.provide('api', client);
});
