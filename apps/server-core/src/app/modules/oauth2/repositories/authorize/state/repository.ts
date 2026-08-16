/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createNanoID } from '@authup/kit';
import type { ICache } from '@authup/server-kit';
import { buildCacheKey } from '@authup/server-kit';
import type { IOAuth2AuthorizeStateRepository, OAuth2AuthorizationState } from '../../../../../../core/index.ts';
import { CacheOAuth2Prefix } from '../../constants.ts';

export class OAuth2AuthorizationStateRepository implements IOAuth2AuthorizeStateRepository {
    protected cache : ICache;

    constructor(cache: ICache) {
        this.cache = cache;
    }

    async insert(data: OAuth2AuthorizationState): Promise<string> {
        const state = createNanoID();

        await this.cache.set(
            buildCacheKey({
                prefix: CacheOAuth2Prefix.AUTHORIZATION_STATE,
                key: state,
            }),
            data,
            { ttl: 1000 * 60 * 30 }, // 30 min
        );

        return state;
    }

    async popOneById(key: string): Promise<OAuth2AuthorizationState | null> {
        return this.cache.pop<OAuth2AuthorizationState>(buildCacheKey({
            prefix: CacheOAuth2Prefix.AUTHORIZATION_STATE,
            key,
        }));
    }
}
