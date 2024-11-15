/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCode } from '@authup/core-kit';
import type { Cache } from '@authup/server-kit';
import { buildCacheKey, useCache } from '@authup/server-kit';
import { OAuth2CachePrefix } from '../../constants';

export class OAuth2AuthorizationCodeRepository {
    protected cache : Cache;

    constructor() {
        this.cache = useCache();
    }

    async get(code: string) : Promise<OAuth2AuthorizationCode | undefined> {
        const entity = await this.cache.get(buildCacheKey({
            prefix: OAuth2CachePrefix.AUTHORIZATION_CODE,
            key: code,
        }));

        if (entity) {
            return entity;
        }

        return undefined;
    }

    async set(entity: OAuth2AuthorizationCode, ttl: number) {
        await this.cache.set(buildCacheKey({
            prefix: OAuth2CachePrefix.AUTHORIZATION_CODE,
            key: entity.id,
        }), entity, {
            ttl,
        });
    }
}
