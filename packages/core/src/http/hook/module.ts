/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TokenGrantResponse } from '@hapic/oauth2';
import type { Client, HookErrorFn } from 'hapic';
import {
    HeaderName, Headers, HookName, stringifyAuthorizationHeader,
} from 'hapic';
import { APIClient } from '../api-client';
import type { TokenCreator } from '../token-creator';
import { createTokenCreator } from '../token-creator';
import type { TokenHookOptions } from './type';
import { getRequestRetryState, isAPIClientTokenExpiredError } from './utils';

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

    let baseURL : string;
    if (options.baseURL) {
        baseURL = options.baseURL;
    } else {
        baseURL = client.getBaseURL();
    }

    let creator : TokenCreator;
    if (typeof options.tokenCreator === 'function') {
        creator = options.tokenCreator;
    } else {
        creator = createTokenCreator({
            ...options.tokenCreator,
            baseURL,
        });
    }

    let refreshPromise : Promise<TokenGrantResponse> | undefined;
    const create = async (myCreator: TokenCreator) : Promise<TokenGrantResponse> => {
        if (refreshPromise) {
            return refreshPromise;
        }

        refreshPromise = myCreator();

        if (client[tokenInterceptorTimeoutSymbol]) {
            clearTimeout(client[tokenInterceptorTimeoutSymbol]);
        }

        return refreshPromise
            .then((response) => {
                client.setAuthorizationHeader({
                    type: 'Bearer',
                    token: response.access_token,
                });

                if (options.tokenCreated) {
                    options.tokenCreated(response);
                }

                refreshPromise = undefined;

                return response;
            })
            .catch((e) => {
                client.unsetAuthorizationHeader();

                if (options.tokenFailed) {
                    options.tokenFailed(e);
                }

                refreshPromise = undefined;

                return Promise.reject(e);
            });
    };

    const creatorClient = new APIClient({ baseURL });

    const registerTimer = (response: TokenGrantResponse) => {
        if (!options.timer || !response.refresh_token || !response.expires_in || refreshPromise) {
            return;
        }

        const refreshInMs = (response.expires_in - 60) * 1000;
        if (refreshInMs <= 0) {
            return;
        }

        if (client[tokenInterceptorTimeoutSymbol]) {
            clearTimeout(client[tokenInterceptorTimeoutSymbol]);
        }

        client[tokenInterceptorTimeoutSymbol] = setTimeout(async () => {
            const myCreator : TokenCreator = () => creatorClient.token.createWithRefreshToken({
                refresh_token: response.refresh_token,
            });

            await create(myCreator)
                .then((response) => {
                    registerTimer(response);
                    return response;
                });
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

        return create(creator)
            .then((response) => {
                registerTimer(response);

                if (request.headers instanceof Headers) {
                    request.headers.set(HeaderName.AUTHORIZATION, stringifyAuthorizationHeader({
                        type: 'Bearer',
                        token: response.access_token,
                    }));
                }

                return client.request(request);
            });
    };

    client[tokenInterceptorSymbol] = client.on(HookName.RESPONSE_ERROR, onReject);
}
