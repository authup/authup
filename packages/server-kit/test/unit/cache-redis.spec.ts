/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { RedisCache } from '../../src';

// Bounded connection so this suite SKIPS (rather than hangs) when no redis is
// reachable — CI without the compose stack, a laptop with docker down, etc.
// With a compose redis up (`docker compose up -d redis`) it exercises the real
// adapter.
function createCache(): RedisCache {
    const cache = new RedisCache({
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT ?? 6379),
        lazyConnect: true,
        connectTimeout: 1_500,
        maxRetriesPerRequest: 1,
        // fail fast instead of reconnecting forever when redis is down
        retryStrategy: () => null,
    } as never);

    // swallow the async error events a down instance emits (unhandled 'error'
    // would otherwise surface as a noisy rejection)
    (cache as unknown as { client: { on(event: string, cb: () => void): void } })
        .client.on('error', () => { /* ignored — availability is probed below */ });

    return cache;
}

async function quit(cache: RedisCache): Promise<void> {
    try {
        await (cache as unknown as { client: { quit(): Promise<unknown> } }).client.quit();
    } catch {
        // already disconnected
    }
}

const probe = createCache();
let available: boolean;
try {
    await probe.set('__cache_probe__', 1, { ttl: 1_000 });
    await probe.drop('__cache_probe__');
    available = true;
} catch {
    available = false;
}
await quit(probe);

const describeRedis = available ? describe : describe.skip;

describeRedis('src/cache/adapters/redis', () => {
    let cache: RedisCache;

    beforeAll(() => {
        cache = createCache();
    });

    afterEach(async () => {
        await cache.clear();
    });

    afterAll(async () => {
        await quit(cache);
    });

    describe('get (falsy round-trip)', () => {
        it('returns null for an absent key', async () => {
            expect(await cache.get('missing')).toBeNull();
        });

        it('round-trips a stored falsy value instead of reading back null', async () => {
            await cache.set('zero', 0, { ttl: 5_000 });
            await cache.set('flag', false, { ttl: 5_000 });
            await cache.set('empty', '', { ttl: 5_000 });

            expect(await cache.get('zero')).toBe(0);
            expect(await cache.get('flag')).toBe(false);
            expect(await cache.get('empty')).toBe('');
        });
    });

    describe('has', () => {
        it('is true for a stored falsy value and false when absent', async () => {
            await cache.set('zero', 0, { ttl: 5_000 });

            expect(await cache.has('zero')).toBe(true);
            expect(await cache.has('missing')).toBe(false);
        });
    });

    describe('add (set-if-absent)', () => {
        it('stores when absent and refuses to overwrite when present', async () => {
            expect(await cache.add('lock', 'first', { ttl: 5_000 })).toBe(true);
            expect(await cache.add('lock', 'second', { ttl: 5_000 })).toBe(false);
            expect(await cache.get('lock')).toBe('first');
        });
    });

    describe('increment (atomic counter)', () => {
        it('returns the post-increment value and never loses a concurrent update', async () => {
            expect(await cache.increment('counter', 1, { ttl: 5_000 })).toBe(1);

            const outputs = await Promise.all(
                Array.from({ length: 10 }, () => cache.increment('counter', 1, { ttl: 5_000 })),
            );

            expect(await cache.get('counter')).toBe(11);
            expect(new Set(outputs).size).toBe(10);
        });
    });
});
