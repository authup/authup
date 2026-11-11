/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from 'redis-extension';
import {
    afterAll,
    afterEach,
    describe,
    expect,
    it,
} from 'vitest';
import type { TokenCacheEntry } from 'vouchly';
import { RedisTokenCache } from '../../src';

const entry : TokenCacheEntry = {
    claims: { sub: 'user', exp: 1 },
    issuer: 'authup',
    source: 'local',
};

function createClient(port: number) : Client {
    const client = new Client({
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port,
        lazyConnect: true,
        connectTimeout: 1_500,
        maxRetriesPerRequest: 0,
        enableOfflineQueue: false,
        retryStrategy: () => null,
    });

    client.on('error', () => { /* availability is probed or the outage is the point */ });

    return client;
}

describe('redis token cache (unreachable redis)', () => {
    // nothing listens on port 1
    const client = createClient(1);
    const cache = new RedisTokenCache(client);

    afterAll(() => {
        client.disconnect();
    });

    it('get reads a miss instead of failing', async () => {
        await expect(cache.get('abc')).resolves.toBeUndefined();
    });

    it('set rejects', async () => {
        await expect(cache.set('abc', entry, 10)).rejects.toThrow();
    });
});

// Runs against a real redis only when one answers on REDIS_PORT (default 6379).
const probe = createClient(Number(process.env.REDIS_PORT ?? 6379));
let available: boolean;

try {
    await probe.connect();
    await probe.ping();
    available = true;
} catch {
    available = false;
}

probe.disconnect();

describe.skipIf(!available)('redis token cache (real redis)', () => {
    const client = createClient(Number(process.env.REDIS_PORT ?? 6379));
    const cache = new RedisTokenCache(client);

    afterEach(async () => {
        await client.del('vouchly:abc');
    });

    afterAll(() => {
        client.disconnect();
    });

    it('round-trips an entry under the vouchly key', async () => {
        await client.connect().catch(() => undefined);
        await cache.set('abc', entry, 10);

        await expect(cache.get('abc')).resolves.toEqual(entry);
        await expect(client.pttl('vouchly:abc')).resolves.toBeGreaterThan(9_000);
    });

    it('get reads a wrong-type key and a value that is not JSON as a miss', async () => {
        await client.connect().catch(() => undefined);
        await client.rpush('vouchly:abc', 'a');
        await expect(cache.get('abc')).resolves.toBeUndefined();

        await client.del('vouchly:abc');
        await client.set('vouchly:abc', 'not json');
        await expect(cache.get('abc')).resolves.toBeUndefined();
    });
});
