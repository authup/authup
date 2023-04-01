/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode, HTTPClient, hasOwnProperty } from '@authup/common';
import type { ConfigInput } from 'hapic';
import { isClientError } from 'hapic';
import { useRuntimeConfig } from '#imports';
import { defineNuxtPlugin } from '#app';
import { useAuthStore } from '../store/auth';

declare module '#app' {
    interface NuxtApp {
        $api: HTTPClient;
    }
}

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $api: HTTPClient;
    }
}

export default defineNuxtPlugin((ctx) => {
    const runtimeConfig = useRuntimeConfig();

    const config : ConfigInput = {
        driver: {
            baseURL: runtimeConfig.public.apiUrl,
            withCredentials: true,
        },
    };

    const client = new HTTPClient(config);
    client.mountResponseInterceptor(
        (data) => data,
        (error) => {
            if (
                isClientError(error) &&
                error.response &&
                error.response.data &&
                hasOwnProperty(error.response.data, 'message')
            ) {
                error.message = error.response.data.message as string;
            }

            return Promise.reject(error);
        },
    );

    let interceptorId : undefined | number;

    const store = useAuthStore(ctx.$pinia);
    store.$subscribe((mutation, state) => {
        if (mutation.storeId !== 'auth') return;

        if (state.accessToken) {
            client.setAuthorizationHeader({
                type: 'Bearer',
                token: state.accessToken,
            });

            interceptorId = client.mountResponseInterceptor(
                (data) => data,
                (error) => {
                    if (
                        isClientError(error) &&
                        error.config &&
                        error.response &&
                        error.response.data &&
                        hasOwnProperty(error.response.data, 'code') &&
                        error.response.data.code === ErrorCode.TOKEN_EXPIRED
                    ) {
                        return Promise.resolve()
                            .then(() => store.attemptRefreshToken())
                            .then(() => client.setAuthorizationHeader({
                                type: 'Bearer',
                                token: store.accessToken as string,
                            }))
                            .then(() => client.request(error.config));
                    }

                    return Promise.reject(error);
                },
            );
        } else {
            client.unsetAuthorizationHeader();

            if (interceptorId) {
                client.unmountResponseInterceptor(interceptorId);
            }
        }
    });

    ctx.provide('api', client);
});
