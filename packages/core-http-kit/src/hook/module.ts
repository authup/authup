/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TokenGrantResponse } from '@hapic/oauth2';
import type { Client as BaseClient, HookErrorFn } from 'hapic';
import {
    HeaderName,
    HookName,
    setHeader,
    stringifyAuthorizationHeader,
} from 'hapic';
import { Client } from '../client';
import type { TokenCreator } from '../token-creator';
import { createTokenCreator } from '../token-creator';
import type { ClientResponseErrorTokenHookOptions } from './type';
import { getRequestRetryState, isClientTokenExpiredError } from './utils';

const hookSymbol = Symbol.for('ClientResponseErrorTokenHook');

export class ClientResponseErrorTokenHook {
    protected client : BaseClient;

    protected creator: TokenCreator;

    protected creatorClient : Client;

    protected options : ClientResponseErrorTokenHookOptions;

    protected hookId?: number;

    protected timer : ReturnType<typeof setTimeout> | undefined;

    protected createPromise?: Promise<TokenGrantResponse>;

    constructor(client: BaseClient, options: ClientResponseErrorTokenHookOptions) {
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
        this.creatorClient = new Client({ baseURL });

        client[hookSymbol] = this;
    }

    mount() {
        if (this.hookId) {
            return;
        }

        const handler : HookErrorFn = (err) => {
            if (!isClientTokenExpiredError(err)) {
                return Promise.reject(err);
            }

            const { request } = err;

            const currentState = getRequestRetryState(request);
            if (currentState.retryCount > 0) {
                return Promise.reject(err);
            }

            currentState.retryCount += 1;

            return this.refresh()
                .then((response) => {
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

    setTimer(
        expiresIn: number,
        refreshToken?: string | (() => string | undefined),
    ) {
        if (!this.hookId || !this.options.timer) {
            return;
        }

        this.clearTimer();

        const refreshInMs = (expiresIn - 60) * 1000;
        if (refreshInMs <= 0) {
            Promise.resolve()
                .then(() => this.refresh());

            return;
        }

        this.timer = setTimeout(async () => this.refresh(refreshToken), refreshInMs);
    }

    clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }

    protected async refresh(
        refreshToken?: string | (() => string | undefined),
    ) : Promise<TokenGrantResponse> {
        let creator : TokenCreator | undefined;

        let token : string | undefined;
        if (typeof refreshToken === 'function') {
            token = refreshToken();
        } else {
            token = refreshToken;
        }

        if (token) {
            creator = () => this.creatorClient.token.createWithRefreshToken({
                refresh_token: token,
            });
        } else {
            creator = this.creator;
        }

        return this.executeCreator(creator)
            .then((response) => {
                this.setTimer(response.expires_in, response.refresh_token);

                return response;
            })
            .catch((e) => {
                if (token) {
                    return this.refresh();
                }

                return Promise.reject(e);
            });
    }

    protected async executeCreator(creator: TokenCreator) {
        if (this.createPromise) {
            return this.createPromise;
        }

        this.createPromise = creator();

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

export function hasClientResponseErrorTokenHook(client: BaseClient) {
    return hookSymbol in client;
}

export function unmountClientResponseErrorTokenHook(client: BaseClient) {
    if (!isClientResponseErrorTokenHook(client[hookSymbol])) {
        return;
    }

    (client[hookSymbol] as ClientResponseErrorTokenHook).unmount();

    delete client[hookSymbol];
}

export function mountClientResponseErrorTokenHook(
    client: BaseClient,
    options: ClientResponseErrorTokenHookOptions,
) : ClientResponseErrorTokenHook {
    if (isClientResponseErrorTokenHook(client[hookSymbol])) {
        return client[hookSymbol];
    }

    const interceptor = new ClientResponseErrorTokenHook(client, options);
    interceptor.mount();

    return interceptor;
}
