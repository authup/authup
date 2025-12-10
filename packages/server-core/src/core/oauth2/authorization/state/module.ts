/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { OAuth2Error } from '@authup/specs';
import type {
    IOAuth2AuthorizationStateManager,
    IOAuth2AuthorizeStateRepository,
    OAuth2AuthorizationState,
} from './types';

export class OAuth2AuthorizationStateManager implements IOAuth2AuthorizationStateManager {
    protected repository: IOAuth2AuthorizeStateRepository;

    constructor(repository: IOAuth2AuthorizeStateRepository) {
        this.repository = repository;
    }

    async save(data: OAuth2AuthorizationState) : Promise<string> {
        return this.repository.insert(data);
    }

    async verify(state: string, input: Partial<OAuth2AuthorizationState>): Promise<OAuth2AuthorizationState> {
        const payload = await this.repository.findOneById(state);
        if (!payload) {
            throw OAuth2Error.stateInvalid();
        }

        // avoid replay attacks
        await this.repository.remove(state);

        if (
            payload.ip &&
            input.ip !== payload.ip
        ) {
            throw OAuth2Error.stateInvalid();
        }

        if (
            payload.userAgent &&
            input.userAgent !== payload.userAgent
        ) {
            throw OAuth2Error.stateInvalid();
        }

        return payload;
    }
}
