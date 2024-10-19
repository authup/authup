/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { singa } from 'singa';
import { isRedisClientUsable } from '../redis';
import { MemoryCache } from './memory';
import { RedisCache } from './redis';
import type { Cache } from './types';

const instance = singa<Cache>({
    name: 'cache',
    factory: () => {
        if (isRedisClientUsable()) {
            return new RedisCache();
        }

        return new MemoryCache();
    },
});

export function useCache() {
    return instance.use();
}
