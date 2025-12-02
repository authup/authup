/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createNanoID } from '@authup/kit';
import type { Cache } from '@authup/server-kit';
import { buildCacheKey, useCache } from '@authup/server-kit';
import type { IOAuth2AuthorizeStateRepository, OAuth2AuthorizeState } from '../../../../../../core';
import { CacheOAuth2Prefix } from '../../constants';

export class OAuth2AuthorizeStateRepository implements IOAuth2AuthorizeStateRepository {
    protected cache : Cache;

    constructor() {
        this.cache = useCache();
    }

    async findOneById(key: string): Promise<OAuth2AuthorizeState | null> {
        const id = buildCacheKey({ prefix: CacheOAuth2Prefix.AUTHORIZATION_CODE, key });
        const payload = await this.cache.get(id);
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

    async insert(data: OAuth2AuthorizeState): Promise<string> {
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
