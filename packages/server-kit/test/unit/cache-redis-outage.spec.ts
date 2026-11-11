/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { RedisCache } from '../../src';

// Nothing listens on port 1, and the client neither retries nor queues, so
// every command fails with a connection error at once.
function createUnreachableCache(): RedisCache {
    const cache = new RedisCache({
        host: '127.0.0.1',
        port: 1,
        lazyConnect: true,
        connectTimeout: 500,
        maxRetriesPerRequest: 0,
        enableOfflineQueue: false,
        retryStrategy: () => null,
    } as never);

    (cache as unknown as { client: { on(event: string, cb: () => void): void } })
        .client.on('error', () => { /* the outage is the point */ });

    return cache;
}

describe('src/cache/adapters/redis (unreachable redis)', () => {
    let cache: RedisCache;

    beforeAll(() => {
        cache = createUnreachableCache();
    });

    afterAll(() => {
        (cache as unknown as { client: { disconnect(): void } }).client.disconnect();
    });

    it('get reads a miss instead of failing', async () => {
        await expect(cache.get('key')).resolves.toBeNull();
    });

    it('pop rejects', async () => {
        await expect(cache.pop('key')).rejects.toThrow();
    });

    it('has rejects', async () => {
        await expect(cache.has('key')).rejects.toThrow();
    });

    it('set rejects', async () => {
        await expect(cache.set('key', 1, { ttl: 1_000 })).rejects.toThrow();
    });

    it('add rejects', async () => {
        await expect(cache.add('key', 1, { ttl: 1_000 })).rejects.toThrow();
    });

    it('renewIfValue rejects', async () => {
        await expect(cache.renewIfValue('key', 'owner', 1_000)).rejects.toThrow();
    });

    it('dropIfValue rejects', async () => {
        await expect(cache.dropIfValue('key', 'owner')).rejects.toThrow();
    });

    it('increment rejects', async () => {
        await expect(cache.increment('key', 1, { ttl: 1_000 })).rejects.toThrow();
    });

    it('drop rejects', async () => {
        await expect(cache.drop('key')).rejects.toThrow();
    });

    it('dropMany resolves: the pipeline reports each failed command in its results, which are not read', async () => {
        await expect(cache.dropMany(['a', 'b'])).resolves.toBeUndefined();
    });

    it('clear rejects, with and without a prefix', async () => {
        await expect(cache.clear({ prefix: 'p:' })).rejects.toThrow();
        await expect(cache.clear()).rejects.toThrow();
    });
});
