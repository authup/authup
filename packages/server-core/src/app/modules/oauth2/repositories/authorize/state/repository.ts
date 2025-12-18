/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createNanoID } from '@authup/kit';
import type { ICache } from '@authup/server-kit';
import { buildCacheKey } from '@authup/server-kit';
import type { IOAuth2AuthorizeStateRepository, OAuth2AuthorizationState } from '../../../../../../core';
import { CacheOAuth2Prefix } from '../../constants';

export class OAuth2AuthorizationStateRepository implements IOAuth2AuthorizeStateRepository {
    protected cache : ICache;

    constructor(cache: ICache) {
        this.cache = cache;
    }

    async findOneById(key: string): Promise<OAuth2AuthorizationState | null> {
        const id = buildCacheKey({ prefix: CacheOAuth2Prefix.AUTHORIZATION_CODE, key });
        const payload = await this.cache.get<OAuth2AuthorizationState>(id);
        if (payload) {
            return payload;
        }

        return null;
    }

    async remove(key: string): Promise<void> {
        await this.cache.drop(
            buildCacheKey({ prefix: CacheOAuth2Prefix.AUTHORIZATION_CODE, key }),
        );
    }

    async insert(data: OAuth2AuthorizationState): Promise<string> {
        const state = createNanoID();

        await this.cache.set(
            buildCacheKey({ prefix: CacheOAuth2Prefix.AUTHORIZATION_CODE, key: state }),
            data,
            {
                ttl: 1000 * 60 * 30, // 30 min
            },
        );

        return state;
    }
}
