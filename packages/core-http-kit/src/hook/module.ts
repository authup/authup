/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isJWTErrorCode } from '@authup/specs';
import type { TokenGrantResponse } from '@hapic/oauth2';
import { EventEmitter } from '@posva/event-emitter';
import type { Client as BaseClient } from 'hapic';
import {
    HeaderName,
    HookName, isClientError, setHeader,
    stringifyAuthorizationHeader, unsetHeader,
} from 'hapic';
import type { TokenCreator } from '../token-creator';
import { createTokenCreator } from '../token-creator';
import { ClientResponseTokenHookEventName } from './constants';
import type { ClientResponseErrorTokenHookEvents, ClientResponseErrorTokenHookOptions } from './types';
import { getClientErrorCode, getClientRequestRetryState } from './utils';

const HOOK_SYMBOL = Symbol.for('ClientResponseHook');

export class ClientResponseErrorTokenHook extends EventEmitter<ClientResponseErrorTokenHookEvents> {
    protected creator: TokenCreator;

    protected options : ClientResponseErrorTokenHookOptions;

    protected timer : ReturnType<typeof setTimeout> | undefined;

    protected refreshPromise?: Promise<TokenGrantResponse>;

    // ------------------------------------------------

    constructor(options: ClientResponseErrorTokenHookOptions) {
        super();

        options.timer ??= true;
        this.options = options;

        let creator : TokenCreator;
        if (typeof options.tokenCreator === 'function') {
            creator = options.tokenCreator;
        } else {
            creator = createTokenCreator({
                ...options.tokenCreator,
                baseURL: options.baseURL,
            });
        }

        this.creator = creator;
    }

    // ------------------------------------------------

    isMounted(client: BaseClient) {
        return HOOK_SYMBOL in client;
    }

    mount(client: BaseClient) {
        if (this.isMounted(client)) {
            return;
        }

        client[HOOK_SYMBOL] = client.on(
            HookName.RESPONSE_ERROR,
            (err) => {
                const { request } = err;

                const currentState = getClientRequestRetryState(request);
                if (currentState.retryCount > 0) {
                    return Promise.reject(err);
                }

                currentState.retryCount += 1;

                const code = getClientErrorCode(err);

                if (isJWTErrorCode(code)) {
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

                            return client.request(request);
                        })
                        .catch((err) => {
                            if (request.headers) {
                                unsetHeader(
                                    request.headers,
                                    HeaderName.AUTHORIZATION,
                                );
                            }

                            return Promise.reject(err);
                        });
                }

                return Promise.reject(err);
            },
        );
    }

    unmount(client: BaseClient) {
        if (!this.isMounted(client)) {
            return;
        }

        client.off(HookName.RESPONSE_ERROR, client[HOOK_SYMBOL] as number);

        delete client[HOOK_SYMBOL];
    }

    // ------------------------------------------------

    setTimer(
        expiresIn: number,
    ) {
        if (!this.options.timer) {
            return;
        }

        this.clearTimer();

        const refreshInMs = (expiresIn - 60) * 1000;
        if (refreshInMs <= 0) {
            Promise.resolve()
                .then(() => this.refresh());

            return;
        }

        this.timer = setTimeout(
            async () => this.refresh(),
            refreshInMs,
        );
    }

    clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }

    // ------------------------------------------------

    /**
     * Refresh token
     *
     * @throws ClientError
     */
    async refresh() : Promise<TokenGrantResponse> {
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = this.creator();

        return this.refreshPromise
            .then((response) => {
                this.setTimer(response.expires_in);

                this.emit(ClientResponseTokenHookEventName.REFRESH_FINISHED, response);

                this.refreshPromise = undefined;

                return response;
            })
            .catch((e) => {
                if (isClientError(e)) {
                    this.emit(ClientResponseTokenHookEventName.REFRESH_FAILED, e);
                } else {
                    this.emit(ClientResponseTokenHookEventName.REFRESH_FAILED, null);
                }

                this.refreshPromise = undefined;

                return Promise.reject(e);
            });
    }
}
