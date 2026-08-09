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
    ip: string,
    userAgent?: string | null
};

export interface IOAuth2AuthorizeStateRepository {
    findOneById(id: string) : Promise<OAuth2AuthorizationState | null>;

    insert(data: OAuth2AuthorizationState) : Promise<string>;

    remove(id: string) : Promise<void>;
}

export interface IOAuth2AuthorizationStateManager {
    save(data: OAuth2AuthorizationState) : Promise<string>;

    verify(state: string, input: Partial<OAuth2AuthorizationState>): Promise<OAuth2AuthorizationState>;
}
