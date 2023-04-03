/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { APIClient } from '@authup/core';
import { BaseClient, isClientDriverInstance } from '@hapic/oauth2';
import { setTimeout } from 'node:timers';
import type { ClientDriverInstance, TokenGrantResponse } from '@hapic/oauth2';
import { isClientError } from 'hapic';
import { createTokenCreator } from '../creator';
import type { TokenCreator } from '../creator';
import type { TokenInterceptorOptions } from './type';
import { getCurrentRequestRetryState, isValidAuthenticateError } from './utils';

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

export function mountTokenInterceptorOnClient(
    client: BaseClient | ClientDriverInstance,
    options: TokenInterceptorOptions,
) : number {
    if (tokenInterceptorSymbol in client) {
        return client[tokenInterceptorSymbol] as number;
    }

    let instance : BaseClient;
    if (isClientDriverInstance(client)) {
        instance = new BaseClient({ driver: client });
    } else {
        instance = client;
    }

    let baseUrl : string;
    if (options.baseUrl) {
        baseUrl = options.baseUrl;
    } else {
        baseUrl = instance.config.baseURL;
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

        setTimeout(async () => {
            const tokenGrantResponse = await refreshToken(
                baseUrl,
                response.refresh_token,
            );

            instance.setAuthorizationHeader({ type: 'Bearer', token: tokenGrantResponse.access_token });

            handleTokenResponse(tokenGrantResponse);
        }, refreshInMs);
    };

    const onReject : (err: any) => any = (err) => {
        if (!isValidAuthenticateError(err)) {
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

                if (isClientError(e)) {
                    e.response.status = 500;
                }

                return Promise.reject(e);
            });
    };

    const interceptorId = instance.mountRequestInterceptor(
        (value) => value,
        onReject,
    );

    client[tokenInterceptorSymbol] = interceptorId;

    return interceptorId;
}
