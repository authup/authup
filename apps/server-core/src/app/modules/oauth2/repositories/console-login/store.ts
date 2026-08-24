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
    ConsoleLoginPending,
    IConsoleLoginStore,
} from '../../../../../core/index.ts';
import { CONSOLE_LOGIN_TTL } from '../../../../../core/index.ts';
import { CacheOAuth2Prefix } from '../constants.ts';

/**
 * The pending console login is a 5-minute blob, so a cache entry is the right
 * home for it, unlike the session credential it leads to: that one is a
 * multi-day credential and lives on the `auth_sessions` row (plan 088).
 *
 * Deployment note (the federated login's): the kick and the callback must
 * reach the same cache, so a multi-replica deployment without redis needs
 * sticky routing.
 */
export class ConsoleLoginStore implements IConsoleLoginStore {
    protected cache : ICache;

    constructor(cache: ICache) {
        this.cache = cache;
    }

    async save(data: ConsoleLoginPending): Promise<string> {
        const id = createNanoID();

        await this.cache.set(
            buildCacheKey({
                prefix: CacheOAuth2Prefix.CONSOLE_LOGIN,
                key: id,
            }),
            data,
            { ttl: CONSOLE_LOGIN_TTL },
        );

        return id;
    }

    async find(id: string): Promise<ConsoleLoginPending | null> {
        return this.cache.get<ConsoleLoginPending>(buildCacheKey({
            prefix: CacheOAuth2Prefix.CONSOLE_LOGIN,
            key: id,
        }));
    }

    async consume(id: string): Promise<ConsoleLoginPending | null> {
        // `pop` is the atomic read-and-drop (redis GETDEL, one tick on the
        // memory adapter). A get followed by a drop is two round-trips, and
        // two simultaneous callbacks for one pending login would both read the
        // payload before either drop landed.
        return this.cache.pop<ConsoleLoginPending>(buildCacheKey({
            prefix: CacheOAuth2Prefix.CONSOLE_LOGIN,
            key: id,
        }));
    }
}
