/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RedisConnectionOptions } from '@authup/server-config';
import type { ITaggedCache } from '@rapiq/cache';
import type { Redis } from 'ioredis';

export type TaggedCacheCreateInput = {
    redis: RedisConnectionOptions | false | undefined,
    onError: (error: unknown) => void,
};

export type TaggedCacheClientCreateInput = Exclude<RedisConnectionOptions, false>;

export type TaggedCacheClient = {
    client: Redis,
    prefix: string,
};

export type TaggedCacheCreateResult = {
    cache: ITaggedCache,
    /**
     * Connects the client and settles once it is ready, has ended or the connect timeout ran out; never rejects.
     */
    ready: () => Promise<void>,
    dispose: () => Promise<void>,
};
