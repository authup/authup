/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TokenGrantResponse } from '@hapic/oauth2';
import type { Client, HookErrorFn } from 'hapic';
import {
    HeaderName,
    HookName,
    setHeader,
    stringifyAuthorizationHeader,
} from 'hapic';
import { APIClient } from '../api-client';
import type { TokenCreator } from '../token-creator';
import { createTokenCreator } from '../token-creator';
import type { ClientResponseErrorTokenHookOptions } from './type';
import { getRequestRetryState, isAPIClientTokenExpiredError } from './utils';

const hookSymbol = Symbol.for('ClientResponseErrorTokenHook');

export class ClientResponseErrorTokenHook {
    protected client : Client;

    protected creator: TokenCreator;

    protected creatorClient : APIClient;

    protected options : ClientResponseErrorTokenHookOptions;

    protected hookId?: number;

    protected timer : ReturnType<typeof setTimeout> | undefined;

    protected createPromise?: Promise<TokenGrantResponse>;

    constructor(client: Client, options: ClientResponseErrorTokenHookOptions) {
        this.client = client;

        options.timer ??= true;
        this.options = options;

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

        this.creator = creator;
        this.creatorClient = new APIClient({ baseURL });

        client[hookSymbol] = this;
    }

    mount() {
        if (this.hookId) {
            return;
        }

        const handler : HookErrorFn = (err) => {
            if (!isAPIClientTokenExpiredError(err)) {
                return Promise.reject(err);
            }

            const { request } = err;

            const currentState = getRequestRetryState(request);
            if (currentState.retryCount > 0) {
                return Promise.reject(err);
            }

            currentState.retryCount += 1;

            return this.create(this.creator)
                .then((response) => {
                    this.setTimer(response);

                    if (request.headers) {
                        setHeader(
                            request.headers,
                            HeaderName.AUTHORIZATION,
                            stringifyAuthorizationHeader({
                                type: 'Bearer',
                                token: response.access_token,
                            }),
                        );
                    }

                    return this.client.request(request);
                });
        };

        this.hookId = this.client.on(HookName.RESPONSE_ERROR, handler);
    }

    unmount() {
        if (!this.hookId) {
            return;
        }

        this.client.off(HookName.RESPONSE_ERROR, this.hookId);
        this.hookId = undefined;

        this.clearTimer();
    }

    setTimer(response: Pick<TokenGrantResponse, 'refresh_token' | 'expires_in'>) {
        if (
            !this.hookId ||
            !this.options.timer ||
            !response.refresh_token ||
            !response.expires_in ||
            this.createPromise
        ) {
            return;
        }

        const refreshInMs = (response.expires_in - 60) * 1000;
        if (refreshInMs <= 0) {
            return;
        }

        this.clearTimer();

        this.timer = setTimeout(async () => {
            const myCreator : TokenCreator = () => this.creatorClient.token.createWithRefreshToken({
                refresh_token: response.refresh_token,
            });

            await this.create(myCreator)
                .then((response) => {
                    this.setTimer(response);

                    return response;
                });
        }, refreshInMs);
    }

    clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }

    async create(creator: TokenCreator) {
        if (this.createPromise) {
            return this.createPromise;
        }

        this.createPromise = creator();

        this.clearTimer();

        return this.createPromise
            .then((response) => {
                this.client.setAuthorizationHeader({
                    type: 'Bearer',
                    token: response.access_token,
                });

                if (this.options.tokenCreated) {
                    this.options.tokenCreated(response);
                }

                this.createPromise = undefined;

                return response;
            })
            .catch((e) => {
                this.client.unsetAuthorizationHeader();

                if (this.options.tokenFailed) {
                    this.options.tokenFailed(e);
                }

                this.createPromise = undefined;

                return Promise.reject(e);
            });
    }
}
function isClientResponseErrorTokenHook(input: unknown) : input is ClientResponseErrorTokenHook {
    return input instanceof ClientResponseErrorTokenHook;
}

export function hasClientResponseErrorTokenHook(client: Client) {
    return hookSymbol in client;
}

export function unmountClientResponseErrorTokenHook(client: Client) {
    if (!isClientResponseErrorTokenHook(client[hookSymbol])) {
        return;
    }

    (client[hookSymbol] as ClientResponseErrorTokenHook).unmount();

    delete client[hookSymbol];
}

export function mountClientResponseErrorTokenHook(
    client: Client,
    options: ClientResponseErrorTokenHookOptions,
) : ClientResponseErrorTokenHook {
    if (isClientResponseErrorTokenHook(client[hookSymbol])) {
        return client[hookSymbol];
    }

    const interceptor = new ClientResponseErrorTokenHook(client, options);
    interceptor.mount();

    return interceptor;
}
