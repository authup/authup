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
import type { JWKCacheEntry } from '../../src';
import { JWKCache } from '../../src';

const KID_A = '0b6c3f0e-2a51-4d8e-9f3b-7a1c5e2d4f60';
const KID_B = '1c7d4a1f-3b62-4e9f-a04c-8b2d6f3e5a71';
const KID_C = '2d8e5b2a-4c73-4fa0-b15d-9c3e7a4f6b82';
const T0 = 1_700_000_000_000;

describe('jwk cache', () => {
    let entry : JWKCacheEntry;

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
    });

    it('loads once and serves hits', async () => {
        const cache = new JWKCache();
        const load = vi.fn(async () => entry);

        const a = await cache.resolve({ realmId: 'r1', kid: KID_A }, load);
        const b = await cache.resolve({ realmId: 'r1', kid: KID_A }, load);

        expect(a).toBe(entry);
        expect(b).toBe(entry);
        expect(load).toHaveBeenCalledTimes(1);
    });

    it('keeps realms apart', async () => {
        const cache = new JWKCache();
        const load = vi.fn(async () => entry);

        await cache.resolve({ realmId: 'r1', kid: KID_A }, load);
        await cache.resolve({ realmId: 'r2', kid: KID_A }, load);

        expect(load).toHaveBeenCalledTimes(2);
    });

    it('loads a new kid', async () => {
        const cache = new JWKCache();
        const load = vi.fn(async () => entry);

        await cache.resolve({ realmId: 'r1', kid: KID_A }, load);
        await cache.resolve({ realmId: 'r1', kid: KID_B }, load);

        expect(load).toHaveBeenCalledTimes(2);
    });

    it('expires an entry at exactly ttl', async () => {
        vi.setSystemTime(T0);
        const cache = new JWKCache({ ttl: 10 });
        const load = vi.fn(async () => entry);
        const key = { realmId: 'r1', kid: KID_A };

        await cache.resolve(key, load);
        expect(load).toHaveBeenCalledTimes(1);

        vi.setSystemTime(T0 + 9_999);
        await cache.resolve(key, load);
        expect(load).toHaveBeenCalledTimes(1);

        vi.setSystemTime(T0 + 10_000);
        await cache.resolve(key, load);
        expect(load).toHaveBeenCalledTimes(2);
    });

    it('evicts the oldest entry beyond max', async () => {
        const cache = new JWKCache({ max: 2 });
        const load = vi.fn(async () => entry);

        await cache.resolve({ realmId: 'r1', kid: KID_A }, load);
        await cache.resolve({ realmId: 'r1', kid: KID_B }, load);
        await cache.resolve({ realmId: 'r1', kid: KID_C }, load);
        expect(load).toHaveBeenCalledTimes(3);

        await cache.resolve({ realmId: 'r1', kid: KID_A }, load);
        expect(load).toHaveBeenCalledTimes(4);

        await cache.resolve({ realmId: 'r1', kid: KID_C }, load);
        expect(load).toHaveBeenCalledTimes(4);
    });

    it('shares one flight between concurrent misses', async () => {
        const cache = new JWKCache();
        const { promise: deferred, resolve: release } = Promise.withResolvers<JWKCacheEntry>();
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
        const cache = new JWKCache();
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
});
