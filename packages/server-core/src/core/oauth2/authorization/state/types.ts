/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';

export type OAuth2AuthorizationState = {
    codeRequest?: OAuth2AuthorizationCodeRequest,
    ip: string,
    userAgent: string
};

export interface IOAuth2AuthorizeStateRepository {
    findOneById(id: string) : Promise<OAuth2AuthorizationState | null>;

    insert(data: OAuth2AuthorizationState) : Promise<string>;

    remove(id: string) : Promise<void>;
}

export interface IOAuth2AuthorizationStateManager {
    save(data: OAuth2AuthorizationState) : Promise<string>;

    verify(state: string, input: OAuth2AuthorizationState): Promise<OAuth2AuthorizationState>;
}
