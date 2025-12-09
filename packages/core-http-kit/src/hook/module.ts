/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import { isJWKErrorCode, isJWTErrorCode } from '@authup/specs';
import type { TokenGrantResponse } from '@hapic/oauth2';
import { EventEmitter } from '@posva/event-emitter';
import type { AuthorizationHeader, Client as BaseClient } from 'hapic';
import {
    HeaderName, HookName, isClientError, setHeader, stringifyAuthorizationHeader, unsetHeader,
} from 'hapic';
import { getClientErrorCode } from '../helpers';
import type { TokenCreator } from '../token-creator';
import { createTokenCreator } from '../token-creator';
import { ClientAuthenticationHookEventName } from './constants';
import type { ClientAuthenticationHookEvents, ClientAuthenticationHookOptions } from './types';
import { getClientRequestRetryState } from './utils';

const HOOK_SYMBOL = Symbol.for('ClientResponseHook');

export class ClientAuthenticationHook extends EventEmitter<{
    [K in keyof ClientAuthenticationHookEvents as `${K}`]: ClientAuthenticationHookEvents[K]
}> {
    protected isActive : boolean;

    protected authorizationHeader : AuthorizationHeader | undefined;

    protected clients : BaseClient[];

    protected creator: TokenCreator;

    protected options : ClientAuthenticationHookOptions;

    protected timer : ReturnType<typeof setTimeout> | undefined;

    protected refreshPromise?: Promise<TokenGrantResponse>;

    // ------------------------------------------------

    constructor(options: ClientAuthenticationHookOptions) {
        super();

        this.isActive = true;
        this.authorizationHeader = undefined;

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

    enable() {
        this.isActive = true;
    }

    disable() {
        this.isActive = false;
    }

    // ------------------------------------------------

    setAuthorizationHeader(value: AuthorizationHeader) {
        this.authorizationHeader = value;

        for (let i = 0; i < this.clients.length; i++) {
            this.clients[i].setAuthorizationHeader(value);
        }

        this.emit(ClientAuthenticationHookEventName.HEADER_SET);
    }

    unsetAuthorizationHeader() {
        this.authorizationHeader = undefined;

        for (let i = 0; i < this.clients.length; i++) {
            this.clients[i].unsetAuthorizationHeader();
        }

        this.emit(ClientAuthenticationHookEventName.HEADER_UNSET);
    }

    // ------------------------------------------------

    isAttached(client: BaseClient) {
        return HOOK_SYMBOL in client;
    }

    attach(client: BaseClient) {
        if (this.authorizationHeader) {
            client.setAuthorizationHeader(this.authorizationHeader);
        } else {
            client.unsetAuthorizationHeader();
        }

        const index = this.clients.indexOf(client);
        if (index === -1) {
            this.clients.push(client);
        }

        if (!this.isAttached(client)) {
            Object.assign(client, {
                [HOOK_SYMBOL]: client.on(
                    HookName.RESPONSE_ERROR,
                    (err) => {
                        if (!this.isActive) {
                            return Promise.reject(err);
                        }

                        const { request } = err;

                        const currentState = getClientRequestRetryState(request);
                        if (currentState.retryCount > 0) {
                            return Promise.reject(err);
                        }

                        currentState.retryCount += 1;

                        const code = getClientErrorCode(err);

                        if (isJWKErrorCode(code)) {
                            this.unsetAuthorizationHeader();

                            if (request.headers) {
                                unsetHeader(
                                    request.headers,
                                    HeaderName.AUTHORIZATION,
                                );
                            }

                            return Promise.reject(err);
                        }

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
                ),
            });
        }
    }

    detach(client: BaseClient) {
        client.unsetAuthorizationHeader();

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
        if (refreshInMs > 0) {
            this.timer = setTimeout(
                async () => this.refresh(),
                refreshInMs,
            );
        }
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
    protected async refresh() : Promise<TokenGrantResponse> {
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = this.creator();

        return this.refreshPromise
            .then((response) => {
                this.setTimer(response.expires_in);

                this.emit(ClientAuthenticationHookEventName.REFRESH_FINISHED, response);

                this.refreshPromise = undefined;

                this.setAuthorizationHeader({
                    type: 'Bearer',
                    token: response.access_token,
                });

                return response;
            })
            .catch((e) => {
                if (isClientError(e)) {
                    this.emit(ClientAuthenticationHookEventName.REFRESH_FAILED, e);
                } else {
                    this.emit(ClientAuthenticationHookEventName.REFRESH_FAILED, null);
                }

                this.refreshPromise = undefined;

                this.unsetAuthorizationHeader();

                return Promise.reject(e);
            });
    }
}
