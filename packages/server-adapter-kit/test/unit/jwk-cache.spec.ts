/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { JWTError } from '@authup/specs';
import type { JWKCacheData, JWKCacheOptions } from '../../src';
import { JWKResolver, MemoryVerifierCache, RedisVerifierCache } from '../../src';

function create(options?: JWKCacheOptions) {
    return new JWKResolver(new MemoryVerifierCache(), options);
}

const KID_A = '0b6c3f0e-2a51-4d8e-9f3b-7a1c5e2d4f60';
const KID_B = '1c7d4a1f-3b62-4e9f-a04c-8b2d6f3e5a71';

describe('jwk resolver', () => {
    let entry : JWKCacheData;

    beforeAll(async () => {
        const pair = await crypto.subtle.generateKey(
            {
                name: 'RSASSA-PKCS1-v1_5',
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: 'SHA-256',
            },
            true,
            ['sign', 'verify'],
        );

        entry = { key: pair.publicKey, algorithm: 'RS256' };
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('loads once and serves hits', async () => {
        const cache = create();
        const load = vi.fn(async () => entry);

        const a = await cache.resolve({ realmId: 'r1', kid: KID_A }, load);
        const b = await cache.resolve({ realmId: 'r1', kid: KID_A }, load);

        expect(a).toBe(entry);
        expect(b).toBe(entry);
        expect(load).toHaveBeenCalledTimes(1);
    });

    it('keeps realms apart', async () => {
        const cache = create();
        const load = vi.fn(async () => entry);

        await cache.resolve({ realmId: 'r1', kid: KID_A }, load);
        await cache.resolve({ realmId: 'r2', kid: KID_A }, load);

        expect(load).toHaveBeenCalledTimes(2);
    });

    it('loads a new kid', async () => {
        const cache = create();
        const load = vi.fn(async () => entry);

        await cache.resolve({ realmId: 'r1', kid: KID_A }, load);
        await cache.resolve({ realmId: 'r1', kid: KID_B }, load);

        expect(load).toHaveBeenCalledTimes(2);
    });

    it('expires an entry at exactly ttl', async () => {
        // the memory cache measures age with performance.now()
        let now = performance.now();
        vi.spyOn(performance, 'now').mockImplementation(() => now);

        const cache = create({ ttl: 10 });
        const load = vi.fn(async () => entry);
        const key = { realmId: 'r1', kid: KID_A };

        await cache.resolve(key, load);
        expect(load).toHaveBeenCalledTimes(1);

        now += 9_999;
        await cache.resolve(key, load);
        expect(load).toHaveBeenCalledTimes(1);

        now += 1;
        await cache.resolve(key, load);
        expect(load).toHaveBeenCalledTimes(2);
    });

    it('caches nothing with ttl 0', async () => {
        const cache = create({ ttl: 0 });
        const load = vi.fn(async () => entry);
        const key = { realmId: 'r1', kid: KID_A };

        await cache.resolve(key, load);
        await cache.resolve(key, load);

        expect(load).toHaveBeenCalledTimes(2);
    });

    it('keeps keys in memory for the redis cache', async () => {
        const redis = new RedisVerifierCache({} as ConstructorParameters<typeof RedisVerifierCache>[0]);
        const key = { realmId: 'r1', kid: KID_A };

        await redis.setJwk(key, entry, 10);

        await expect(redis.getJwk(key)).resolves.toBe(entry);
    });

    it('shares one flight between concurrent misses', async () => {
        const cache = create();
        const { promise: deferred, resolve: release } = Promise.withResolvers<JWKCacheData>();
        const load = vi.fn(() => deferred);
        const key = { realmId: 'r1', kid: KID_A };

        const x = cache.resolve(key, load);
        const y = cache.resolve(key, load);

        release(entry);

        await expect(x).resolves.toBe(entry);
        await expect(y).resolves.toBe(entry);
        expect(load).toHaveBeenCalledTimes(1);
    });

    it('shares one rejected flight and stores nothing', async () => {
        const cache = create();
        const load = vi.fn()
            .mockRejectedValueOnce(new Error('404'))
            .mockResolvedValue(entry);
        const key = { realmId: 'r1', kid: KID_A };

        const [x, y] = await Promise.allSettled([
            cache.resolve(key, load),
            cache.resolve(key, load),
        ]);

        expect(x.status).toBe('rejected');
        expect(y.status).toBe('rejected');
        expect(load).toHaveBeenCalledTimes(1);

        await expect(cache.resolve(key, load)).resolves.toBe(entry);
        expect(load).toHaveBeenCalledTimes(2);
    });
    it('bounds a stalled flight by the timeout', async () => {
        vi.useFakeTimers();
        const cache = create({ timeout: 5 });
        const stalled = vi.fn(() => new Promise<JWKCacheData>(() => {}));
        const healthy = vi.fn(async () => entry);
        const key = { realmId: 'r1', kid: KID_A };

        const first = cache.resolve(key, stalled);
        const joined = cache.resolve(key, healthy);
        const firstSettled = expect(first).rejects.toBeInstanceOf(JWTError);
        const joinedSettled = expect(joined).rejects.toBeInstanceOf(JWTError);

        await vi.advanceTimersByTimeAsync(5_000);
        await firstSettled;
        await joinedSettled;

        await expect(cache.resolve(key, healthy)).resolves.toBe(entry);
        expect(stalled).toHaveBeenCalledTimes(1);
        expect(healthy).toHaveBeenCalledTimes(1);
    });

    it('does not store the late result of a timed-out flight', async () => {
        vi.useFakeTimers();
        const cache = create({ timeout: 5 });
        const { promise: late, resolve: release } = Promise.withResolvers<JWKCacheData>();
        const key = { realmId: 'r1', kid: KID_A };

        const first = cache.resolve(key, () => late);
        const settled = expect(first).rejects.toBeInstanceOf(JWTError);
        await vi.advanceTimersByTimeAsync(5_000);
        await settled;

        release(entry);
        await vi.advanceTimersByTimeAsync(0);

        const load = vi.fn(async () => entry);
        await cache.resolve(key, load);
        expect(load).toHaveBeenCalledTimes(1);
    });
    it.each([
        { ttl: -1 },
        { ttl: NaN },
        { ttl: Infinity },
        { timeout: 0 },
        { timeout: NaN },
        { timeout: 2_147_484 },
    ])('rejects invalid options %o', (options) => {
        expect(() => create(options)).toThrow(TypeError);
    });
});
