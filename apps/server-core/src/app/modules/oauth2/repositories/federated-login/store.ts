/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createNanoID } from '@authup/kit';
import type { ICache } from '@authup/server-kit';
import { buildCacheKey } from '@authup/server-kit';
import type {
    IOAuth2FederatedLoginStore,
    OAuth2FederatedLoginPending,
} from '../../../../../core/index.ts';
import { OAUTH2_FEDERATED_LOGIN_TTL } from '../../../../../core/index.ts';
import { CacheOAuth2Prefix } from '../constants.ts';

export class OAuth2FederatedLoginStore implements IOAuth2FederatedLoginStore {
    protected cache : ICache;

    constructor(cache: ICache) {
        this.cache = cache;
    }

    async save(data: OAuth2FederatedLoginPending): Promise<string> {
        const id = createNanoID();

        await this.cache.set(
            buildCacheKey({
                prefix: CacheOAuth2Prefix.FEDERATED_LOGIN,
                key: id,
            }),
            data,
            { ttl: OAUTH2_FEDERATED_LOGIN_TTL },
        );

        return id;
    }

    async consume(id: string): Promise<OAuth2FederatedLoginPending | null> {
        // `pop` is the atomic read-and-drop (redis GETDEL, one tick on the
        // memory adapter). A get followed by a drop is two round-trips, and
        // two simultaneous completions of one pending login would both read
        // the payload before either drop landed.
        return this.cache.pop<OAuth2FederatedLoginPending>(buildCacheKey({
            prefix: CacheOAuth2Prefix.FEDERATED_LOGIN,
            key: id,
        }));
    }
}
