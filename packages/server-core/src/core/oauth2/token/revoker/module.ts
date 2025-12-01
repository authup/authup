/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';
import type { IOAuth2TokenRepository } from '../types';
import type { IOAuth2TokenRevoker } from './types';

export class OAuth2TokenRevoker implements IOAuth2TokenRevoker {
    protected repository : IOAuth2TokenRepository;

    constructor(repository : IOAuth2TokenRepository) {
        this.repository = repository;
    }

    async revoke(payload: OAuth2TokenPayload) : Promise<void> {
        await this.repository.remove(payload.jti);
        await this.repository.setInactive(payload.jti, payload.exp);
    }
}
