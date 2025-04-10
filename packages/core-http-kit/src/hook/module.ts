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
import { isObject } from '@authup/kit';
import type { TokenCreator } from '../token-creator';
import { createTokenCreator } from '../token-creator';
import { ClientHokenTokenRefresherEventName } from './constants';
import type { ClientHookTokenRefresherEvents, ClientHookTokenRefresherOptions } from './types';
import { getClientErrorCode, getClientRequestRetryState } from './utils';

const HOOK_SYMBOL = Symbol.for('ClientResponseHook');

export class ClientHookTokenRefresher extends EventEmitter<ClientHookTokenRefresherEvents> {
    protected clients : BaseClient[];

    protected creator: TokenCreator;

    protected options : ClientHookTokenRefresherOptions;

    protected timer : ReturnType<typeof setTimeout> | undefined;

    protected refreshPromise?: Promise<TokenGrantResponse>;

    // ------------------------------------------------

    constructor(options: ClientHookTokenRefresherOptions) {
        super();

        this.clients = [];

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

    call(fn: (client: BaseClient) => void) : void {
        for (let i = 0; i < this.clients.length; i++) {
            fn(this.clients[i]);
        }
    }

    // ------------------------------------------------

    isAttached(client: BaseClient) {
        return HOOK_SYMBOL in client;
    }

    attach(client: BaseClient) {
        const index = this.clients.indexOf(client);
        if (index === -1) {
            this.clients.push(client);
        }

        if (!this.isAttached(client)) {
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

                    if (
                        isJWTErrorCode(code) ||
                        (isObject(err.response) && err.response.status === 401)
                    ) {
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

                                this.call((c) => c.setAuthorizationHeader({
                                    type: 'Bearer',
                                    token: response.access_token,
                                }));

                                return client.request(request);
                            })
                            .catch((err) => {
                                if (request.headers) {
                                    unsetHeader(
                                        request.headers,
                                        HeaderName.AUTHORIZATION,
                                    );
                                }

                                this.call((c) => c.unsetAuthorizationHeader());

                                return Promise.reject(err);
                            });
                    }

                    return Promise.reject(err);
                },
            );
        }
    }

    detach(client: BaseClient) {
        const index = this.clients.indexOf(client);
        if (index !== -1) {
            this.clients.splice(index, 1);
        }

        if (this.isAttached(client)) {
            client.off(HookName.RESPONSE_ERROR, client[HOOK_SYMBOL] as number);

            delete client[HOOK_SYMBOL];
        }
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

                this.emit(ClientHokenTokenRefresherEventName.REFRESH_FINISHED, response);

                this.refreshPromise = undefined;

                return response;
            })
            .catch((e) => {
                if (isClientError(e)) {
                    this.emit(ClientHokenTokenRefresherEventName.REFRESH_FAILED, e);
                } else {
                    this.emit(ClientHokenTokenRefresherEventName.REFRESH_FAILED, null);
                }

                this.refreshPromise = undefined;

                return Promise.reject(e);
            });
    }
}
