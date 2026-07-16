/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';
import { JWTError } from '@authup/specs';
import type { IOAuth2TokenRepository } from '../repository/index.ts';
import type { ISessionTokenRepository } from '../../session-token/index.ts';
import type { IOAuth2TokenRevoker } from './types.ts';

export class OAuth2TokenRevoker implements IOAuth2TokenRevoker {
    protected repository : IOAuth2TokenRepository;

    protected sessionTokenRepository? : ISessionTokenRepository;

    constructor(
        repository : IOAuth2TokenRepository,
        sessionTokenRepository? : ISessionTokenRepository,
    ) {
        this.repository = repository;
        this.sessionTokenRepository = sessionTokenRepository;
    }

    async revoke(input: OAuth2TokenPayload) : Promise<void> {
        if (!input.jti) {
            throw JWTError.payloadPropertyInvalid('jti');
        }

        await this.repository.removeById(input.jti);

        // Blocklist explicitly from the verified payload. `removeById` only
        // writes the inactive marker when the id-keyed cache entry is still
        // present, so after a cache flush/eviction an otherwise-valid access
        // token would return 202 from /token/revoke yet stay active until its
        // natural expiry. Idempotent with the removeById path on a cache hit.
        await this.repository.setInactive(input.jti, input.exp);

        // Soft-revoke the durable row so a refresh grant (which trusts the row,
        // not the cache blocklist) rejects an explicitly revoked refresh token.
        if (this.sessionTokenRepository) {
            await this.sessionTokenRepository.revokeById(input.jti, new Date().toISOString());
        }
    }
}
