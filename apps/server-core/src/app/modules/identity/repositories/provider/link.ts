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
    IIdentityProviderAccountLinkStore,
    IdentityProviderAccountLink,
} from '../../../../../core/index.ts';
import { IDENTITY_PROVIDER_ACCOUNT_LINK_TTL } from '../../../../../core/index.ts';
import { CacheIdentityPrefix } from '../constants.ts';

export class IdentityProviderAccountLinkStore implements IIdentityProviderAccountLinkStore {
    protected cache : ICache;

    constructor(cache: ICache) {
        this.cache = cache;
    }

    async save(data: IdentityProviderAccountLink): Promise<string> {
        const handle = createNanoID();

        await this.cache.set(
            buildCacheKey({
                prefix: CacheIdentityPrefix.PROVIDER_ACCOUNT_LINK,
                key: handle,
            }),
            data,
            { ttl: IDENTITY_PROVIDER_ACCOUNT_LINK_TTL },
        );

        return handle;
    }

    async consume(handle: string): Promise<IdentityProviderAccountLink | null> {
        const key = buildCacheKey({
            prefix: CacheIdentityPrefix.PROVIDER_ACCOUNT_LINK,
            key: handle,
        });

        // `pop` is the atomic read-and-drop (redis GETDEL, one tick on the
        // memory adapter). A get followed by a drop is two round-trips, and
        // two simultaneous redemptions of one handle would both read the
        // payload before either drop landed.
        return this.cache.pop<IdentityProviderAccountLink>(key);
    }
}
