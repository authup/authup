/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { OAuth2RequestError } from '@authup/specs';
import type {
    IOAuth2AuthorizationStateManager,
    IOAuth2AuthorizeStateRepository,
    OAuth2AuthorizationState,
} from './types.ts';

export class OAuth2AuthorizationStateManager implements IOAuth2AuthorizationStateManager {
    protected repository: IOAuth2AuthorizeStateRepository;

    constructor(repository: IOAuth2AuthorizeStateRepository) {
        this.repository = repository;
    }

    async save(data: OAuth2AuthorizationState) : Promise<string> {
        return this.repository.insert(data);
    }

    async verify(state: string, input: Partial<OAuth2AuthorizationState>): Promise<OAuth2AuthorizationState> {
        // The pop is the replay guard: a state is consumed by whichever
        // callback presents it first, whether or not it then passes the
        // binding checks below.
        const payload = await this.repository.popOneById(state);
        if (!payload) {
            throw OAuth2RequestError.stateInvalid();
        }

        if (
            payload.ip &&
            input.ip !== payload.ip
        ) {
            throw OAuth2RequestError.stateInvalid();
        }

        if (
            payload.userAgent &&
            input.userAgent !== payload.userAgent
        ) {
            throw OAuth2RequestError.stateInvalid();
        }

        return payload;
    }
}
