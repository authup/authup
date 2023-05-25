/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TokenGrantResponse } from '@hapic/oauth2';
import type { Client, HookErrorFn } from 'hapic';
import { HookName } from 'hapic';
import { APIClient } from '../api-client';
import type { TokenCreator } from '../token-creator';
import { createTokenCreator } from '../token-creator';
import type { TokenHookOptions } from './type';
import { getRequestRetryState, isAPIClientTokenExpiredError } from './utils';

async function refreshToken(baseURL: string, refreshToken: string) {
    const client = new APIClient({ baseURL });

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

export function hasClientResponseErrorTokenHook(client: Client) {
    return tokenInterceptorSymbol in client;
}

export function unmountClientResponseErrorTokenHook(
    client: Client,
) {
    if (!hasClientResponseErrorTokenHook(client)) {
        return;
    }

    const interceptorId = client[tokenInterceptorSymbol] as number;

    client.off(HookName.RESPONSE_ERROR, interceptorId);

    if (tokenInterceptorTimeoutSymbol in client) {
        clearTimeout(client[tokenInterceptorTimeoutSymbol] as ReturnType<typeof setTimeout>);

        delete client[tokenInterceptorTimeoutSymbol];
    }

    delete client[tokenInterceptorSymbol];
}

export function mountClientResponseErrorTokenHook(
    client: Client,
    options: TokenHookOptions,
) {
    if (hasClientResponseErrorTokenHook(client)) {
        return;
    }

    options.timer ??= true;

    let baseUrl : string;
    if (options.baseURL) {
        baseUrl = options.baseURL;
    } else {
        baseUrl = client.getBaseURL();
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
        if (!options.timer || !response.refresh_token || !response.expires_in) {
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

            client.setAuthorizationHeader({
                type: 'Bearer',
                token: tokenGrantResponse.access_token,
            });

            handleTokenResponse(tokenGrantResponse);
        }, refreshInMs);
    };

    const onReject : HookErrorFn = async (err) : Promise<any> => {
        if (!isAPIClientTokenExpiredError(err)) {
            return Promise.reject(err);
        }

        const { request } = err;

        const currentState = getRequestRetryState(request);
        if (currentState.retryCount > 0) {
            return Promise.reject(err);
        }

        currentState.retryCount += 1;

        client.unsetAuthorizationHeader();

        return creator()
            .then((tokenGrantResponse) => {
                client.setAuthorizationHeader({
                    type: 'Bearer',
                    token: tokenGrantResponse.access_token,
                });

                handleTokenResponse(tokenGrantResponse);

                if (options.tokenCreated) {
                    options.tokenCreated(tokenGrantResponse);
                }
            })
            .then(() => client.request(request))
            .catch((e) => {
                client.unsetAuthorizationHeader();

                return Promise.reject(e);
            });
    };

    client[tokenInterceptorSymbol] = client.on(HookName.RESPONSE_ERROR, onReject);
}
