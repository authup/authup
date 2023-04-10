/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Driver, TokenGrantResponse } from '@hapic/oauth2';
import { BaseClient, isDriver } from '@hapic/oauth2';
import { isDriverError } from 'hapic';
import { APIClient } from '../api-client';
import type { TokenCreator } from '../token-creator';
import { createTokenCreator } from '../token-creator';
import type { TokenInterceptorOptions } from './type';
import { getCurrentRequestRetryState, isValidAuthenticationError } from './utils';

type RejectFn = (err: any) => any;

async function refreshToken(baseURL: string, refreshToken: string) {
    const client = new APIClient({ driver: { baseURL } });

    let tokenGrantResponse : TokenGrantResponse | undefined;
    try {
        tokenGrantResponse = await client.token.createWithRefreshToken({
            refresh_token: refreshToken,
        });
    } catch (e) {
        // don't do anything, wait for next time interceptor triggers.
    }

    return tokenGrantResponse;
}

const tokenInterceptorSymbol = Symbol.for('ClientTokenInterceptor');
const tokenInterceptorTimeoutSymbol = Symbol.for('ClientTokenInterceptorTimeout');

export function isTokenInterceptorMountedOnClient(client: BaseClient | Driver) {
    return tokenInterceptorSymbol in client;
}

export function unmountTokenInterceptorOfClient(
    client: BaseClient | Driver,
) {
    if (!isTokenInterceptorMountedOnClient(client)) {
        return;
    }

    const interceptorId = client[tokenInterceptorSymbol] as number;
    if (isDriver(client)) {
        client.interceptors.response.eject(interceptorId);
    } else {
        client.unmountResponseInterceptor(interceptorId);
    }

    if (tokenInterceptorTimeoutSymbol in client) {
        clearTimeout(client[tokenInterceptorTimeoutSymbol] as ReturnType<typeof setTimeout>);

        delete client[tokenInterceptorTimeoutSymbol];
    }

    delete client[tokenInterceptorSymbol];
}

export function mountTokenInterceptorOnClient(
    client: BaseClient | Driver,
    options: TokenInterceptorOptions,
) {
    if (isTokenInterceptorMountedOnClient(client)) {
        return;
    }

    let instance : BaseClient;
    if (isDriver(client)) {
        instance = new BaseClient({ driver: client });
    } else {
        instance = client;
    }

    let baseUrl : string;
    if (options.baseUrl) {
        baseUrl = options.baseUrl;
    } else {
        baseUrl = instance.getBaseURL();
    }

    let creator : TokenCreator;
    if (typeof options.tokenCreator === 'function') {
        creator = options.tokenCreator;
    } else {
        creator = createTokenCreator({
            ...options.tokenCreator,
            baseUrl,
        });
    }

    const handleTokenResponse = (response: TokenGrantResponse) => {
        if (!response.refresh_token || !response.expires_in) {
            return;
        }

        const refreshInMs = (response.expires_in - 60) * 1000;
        if (refreshInMs <= 0) {
            return;
        }

        client[tokenInterceptorTimeoutSymbol] = setTimeout(async () => {
            const tokenGrantResponse = await refreshToken(
                baseUrl,
                response.refresh_token,
            );

            instance.setAuthorizationHeader({ type: 'Bearer', token: tokenGrantResponse.access_token });

            handleTokenResponse(tokenGrantResponse);
        }, refreshInMs);
    };

    const onReject : RejectFn = async (err) : Promise<any> => {
        if (!isValidAuthenticationError(err)) {
            return Promise.reject(err);
        }

        const { config } = err;

        const currentState = getCurrentRequestRetryState(config);
        if (currentState.retryCount > 0) {
            return Promise.reject(err);
        }

        currentState.retryCount += 1;

        instance.unsetAuthorizationHeader();

        return creator()
            .then((tokenGrantResponse) => {
                instance.setAuthorizationHeader({
                    type: 'Bearer',
                    token: tokenGrantResponse.access_token,
                });

                handleTokenResponse(tokenGrantResponse);
            })
            .then(() => instance.request(config))
            .catch((e) => {
                instance.unsetAuthorizationHeader();

                if (isDriverError(e) && e.response) {
                    e.response.status = 500;
                }

                return Promise.reject(e);
            });
    };

    client[tokenInterceptorSymbol] = instance.mountResponseInterceptor(
        (value) => value,
        onReject,
    );
}
