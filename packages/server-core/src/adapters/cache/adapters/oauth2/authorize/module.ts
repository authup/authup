/*
 * Copyright (c) 2024-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCode } from '@authup/core-kit';
import type { Cache } from '@authup/server-kit';
import { buildCacheKey, useCache } from '@authup/server-kit';
import { OAuth2CachePrefix } from '../../../../../core';
import type { IOAuth2AuthorizationCodeRepository } from '../../../../../core/oauth2/authorize/code/repository';

export class OAuth2AuthorizationCodeRepository implements IOAuth2AuthorizationCodeRepository {
    protected cache : Cache;

    constructor() {
        this.cache = useCache();
    }

    async findOneById(id: string): Promise<OAuth2AuthorizationCode | null> {
        const entity = await this.cache.get(buildCacheKey({
            prefix: OAuth2CachePrefix.AUTHORIZATION_CODE,
            key: id,
        }));

        if (entity) {
            return entity;
        }

        return null;
    }

    async save(input: OAuth2AuthorizationCode): Promise<OAuth2AuthorizationCode> {
        let ttl: number | undefined;

        if (input.max_age) {
            ttl = input.max_age * 1_000;
        }

        await this.cache.set(buildCacheKey({
            prefix: OAuth2CachePrefix.AUTHORIZATION_CODE,
            key: input.id,
        }), input, {
            ttl,
        });

        return input;
    }
}
