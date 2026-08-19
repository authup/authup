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
    IOAuth2FederatedLoginHandleStore,
    OAuth2FederatedLoginHandle,
} from '../../../../../core/index.ts';
import { OAUTH2_FEDERATED_LOGIN_HANDLE_TTL } from '../../../../../core/index.ts';
import { CacheOAuth2Prefix } from '../constants.ts';

export class OAuth2FederatedLoginHandleStore implements IOAuth2FederatedLoginHandleStore {
    protected cache : ICache;

    constructor(cache: ICache) {
        this.cache = cache;
    }

    async save(data: OAuth2FederatedLoginHandle): Promise<string> {
        const handle = createNanoID();

        await this.cache.set(
            buildCacheKey({
                prefix: CacheOAuth2Prefix.FEDERATED_LOGIN_HANDLE,
                key: handle,
            }),
            data,
            { ttl: OAUTH2_FEDERATED_LOGIN_HANDLE_TTL },
        );

        return handle;
    }

    async consume(handle: string): Promise<OAuth2FederatedLoginHandle | null> {
        // `pop` is the atomic read-and-drop (redis GETDEL, one tick on the
        // memory adapter). A get followed by a drop is two round-trips, and
        // two simultaneous redemptions of one handle would both read the
        // payload before either drop landed.
        return this.cache.pop<OAuth2FederatedLoginHandle>(buildCacheKey({
            prefix: CacheOAuth2Prefix.FEDERATED_LOGIN_HANDLE,
            key: handle,
        }));
    }
}
