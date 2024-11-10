/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isRedisClientUsable } from '../../redis';
import { MemoryCacheAdapter } from './memory';
import { RedisCacheAdapter } from './redis';

export function createCacheAdapter() {
    if (isRedisClientUsable()) {
        return new RedisCacheAdapter();
    }

    return new MemoryCacheAdapter();
}
