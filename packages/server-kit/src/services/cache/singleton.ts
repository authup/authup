/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { singa } from 'singa';
import { isRedisClientUsable } from '../redis';
import type { ICacheAdapter } from './adapters';
import { MemoryCacheAdapter, RedisCacheAdapter } from './adapters';
import { Cache } from './module';

const instance = singa<Cache>({
    name: 'cache',
    factory: () => {
        let adapter : ICacheAdapter;
        if (isRedisClientUsable()) {
            adapter = new RedisCacheAdapter();
        } else {
            adapter = new MemoryCacheAdapter();
        }

        return new Cache(adapter);
    },
});

export function useCache() {
    return instance.use();
}
