/*
 * Copyright (c) 2024-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCode } from '@authup/core-kit';
import type { ICache } from '@authup/server-kit';
import { buildCacheKey } from '@authup/server-kit';
import { randomBytes } from 'node:crypto';
import { CacheOAuth2Prefix } from '../../constants';
import type {
    IOAuth2AuthorizationCodeRepository,
    OAuth2AuthorizationCodeInput,
    OAuth2AuthorizationCodeRepositorySaveOptions,
} from '../../../../../../core';

export class OAuth2AuthorizationCodeRepository implements IOAuth2AuthorizationCodeRepository {
    protected cache : ICache;

    constructor(cache: ICache) {
        this.cache = cache;
    }

    async findOneById(id: string): Promise<OAuth2AuthorizationCode | null> {
        const entity = await this.cache.get<OAuth2AuthorizationCode>(buildCacheKey({
            prefix: CacheOAuth2Prefix.AUTHORIZATION_CODE,
            key: id,
        }));

        if (entity) {
            return entity;
        }

        return null;
    }

    async save(
        input: OAuth2AuthorizationCodeInput,
        options: OAuth2AuthorizationCodeRepositorySaveOptions = {},
    ): Promise<OAuth2AuthorizationCode> {
        const ttl = (options.maxAge || 300) * 1_000;

        if (!input.id) {
            input.id = randomBytes(10).toString('hex');
        }

        await this.cache.set(buildCacheKey({
            prefix: CacheOAuth2Prefix.AUTHORIZATION_CODE,
            key: input.id,
        }), input, {
            ttl,
        });

        return input as OAuth2AuthorizationCode;
    }

    async remove(entity: OAuth2AuthorizationCode): Promise<void> {
        return this.removeById(entity.id);
    }

    async removeById(id: string): Promise<void> {
        await this.cache.drop(buildCacheKey({
            prefix: CacheOAuth2Prefix.AUTHORIZATION_CODE,
            key: id,
        }));
    }
}
