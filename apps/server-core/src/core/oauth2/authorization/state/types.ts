/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';

export type OAuth2AuthorizationStateLink = {
    userId: string,
    // The provider the link was initiated for. The callback rejects a
    // state whose providerId does not match the provider of the callback
    // route it arrives on, so a link state cannot be replayed against a
    // different provider's callback.
    providerId: string,
};

export type OAuth2AuthorizationState = {
    codeRequest?: OAuth2AuthorizationCodeRequest,
    /**
     * Present on an account-linking round-trip (plan 091): the callback
     * links the external identity to this user instead of running the
     * login path. Minted only by the bearer-authenticated link-request
     * endpoint, never from client input.
     */
    link?: OAuth2AuthorizationStateLink,
    /**
     * Ties a federated login to the browser that started it (plan 094). The
     * value is set as a cookie when the login starts and required to match
     * when the provider sends the browser back, so a crafted callback URL
     * opened elsewhere establishes nothing. The state's own ip / user agent
     * cannot do this: both are chosen by whoever mints the state (#3439).
     */
    browserNonce?: string,
    ip: string,
    userAgent?: string | null
};

export interface IOAuth2AuthorizeStateRepository {
    insert(data: OAuth2AuthorizationState) : Promise<string>;

    /**
     * Read and delete in one step, so two callbacks presenting the same
     * state cannot both obtain the payload.
     */
    popOneById(id: string) : Promise<OAuth2AuthorizationState | null>;
}

export interface IOAuth2AuthorizationStateManager {
    save(data: OAuth2AuthorizationState) : Promise<string>;

    verify(state: string, input: Partial<OAuth2AuthorizationState>): Promise<OAuth2AuthorizationState>;
}
