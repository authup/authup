/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Logger } from '@authup/server-kit';
import { createNoopLogger } from '@authup/server-kit';
import { Container } from 'eldin';
import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import {
    CacheInjectionKey,
    CacheModule,
    TAGGED_CACHE_CONNECT_TIMEOUT,
    TAGGED_CACHE_PREFIX,
    TaggedCacheInjectionKey,
    createTaggedCache,
    createTaggedCacheClient,
    throttle,
} from '../../../../../src/app/modules/cache';
import type { TaggedCacheClientCreateInput } from '../../../../../src/app/modules/cache';
import { ConfigInjectionKey } from '../../../../../src/app/modules/config';
import { normalizeConfig } from '../../../../../src/app/modules/config/read';
import { LoggerInjectionKey } from '../../../../../src/app/modules/logger';
import { buildTestRedisOptions } from '../../../../app/redis.ts';

describe('app/modules/cache/tagged', () => {
    it('memory driver: a remembered value is served again and dropped by its tag', async () => {
        const { cache, dispose } = createTaggedCache({ redis: false, onError: vi.fn() });
        const read = vi.fn(async () => ({ id: 'a' }));

        await expect(cache.remember('k', read, { tags: () => ['t'] })).resolves.toEqual({ id: 'a' });
        await expect(cache.remember('k', read, { tags: () => ['t'] })).resolves.toEqual({ id: 'a' });
        expect(read).toHaveBeenCalledTimes(1);

        await cache.invalidate(['t']);

        await cache.remember('k', read, { tags: () => ['t'] });
        expect(read).toHaveBeenCalledTimes(2);

        await dispose();
    });

    it('redis options object carrying keyPrefix constructs', async () => {
        const onError = vi.fn();
        const { dispose } = createTaggedCache({
            redis: {
                host: '127.0.0.1',
                port: 1,
                keyPrefix: 'x:',
                lazyConnect: true,
            },
            onError,
        });

        await expect(dispose()).resolves.toBeUndefined();
    });

    it('an existing client is duplicated and left untouched', async () => {
        const client = new Redis({
            port: 1, 
            lazyConnect: true, 
            keyPrefix: 'x:', 
        });
        const { status } = client;

        const { dispose } = createTaggedCache({ redis: client, onError: vi.fn() });

        await expect(dispose()).resolves.toBeUndefined();

        expect(client.status).toEqual(status);
        expect(() => client.disconnect()).not.toThrow();
    });

    it('the driver prefix carries the configured keyPrefix, the driver client none', () => {
        const existing = new Redis({
            port: 1, 
            lazyConnect: true, 
            keyPrefix: 'b:', 
        });
        const cases : [TaggedCacheClientCreateInput, string][] = [
            [{
                host: '127.0.0.1', 
                port: 1, 
                keyPrefix: 'a:', 
            }, `a:${TAGGED_CACHE_PREFIX}`],
            [existing, `b:${TAGGED_CACHE_PREFIX}`],
            ['redis://127.0.0.1:1?keyPrefix=c:', `c:${TAGGED_CACHE_PREFIX}`],
            ['redis://127.0.0.1:1', TAGGED_CACHE_PREFIX],
            [{ host: '127.0.0.1', port: 1 }, TAGGED_CACHE_PREFIX],
        ];

        for (const [input, expected] of cases) {
            const { client, prefix } = createTaggedCacheClient(input);

            client.on('error', () => {});

            expect(prefix).toEqual(expected);
            expect(client.options.keyPrefix).toBeFalsy();

            client.disconnect();
        }

        expect(existing.options.keyPrefix).toEqual('b:');
        expect(TAGGED_CACHE_PREFIX).toEqual('authup');

        existing.disconnect();
    });

    it('a redis url carrying keyPrefix constructs', async () => {
        const { dispose } = createTaggedCache({ redis: 'redis://127.0.0.1:1?keyPrefix=c:', onError: vi.fn() });

        await expect(dispose()).resolves.toBeUndefined();
    });

    it('redis: true constructs', async () => {
        const { dispose } = createTaggedCache({ redis: true, onError: vi.fn() });

        await expect(dispose()).resolves.toBeUndefined();
    });

    it('unreachable redis falls through to the read', async () => {
        const onError = vi.fn();
        const { cache, dispose } = createTaggedCache({ redis: 'redis://127.0.0.1:1', onError });

        const startedAt = Date.now();
        const value = await cache.remember('k', async () => 'value', { tags: () => ['t'] });

        expect(value).toEqual('value');
        expect(Date.now() - startedAt).toBeLessThan(2000);
        expect(onError).toHaveBeenCalled();

        await dispose();
    });

    it('ready waits out the connect timeout against a refused redis and never rejects', async () => {
        const onError = vi.fn();
        const { ready, dispose } = createTaggedCache({ redis: 'redis://127.0.0.1:1', onError });

        const startedAt = Date.now();

        await expect(ready()).resolves.toBeUndefined();

        const elapsed = Date.now() - startedAt;

        expect(elapsed).toBeGreaterThanOrEqual(TAGGED_CACHE_CONNECT_TIMEOUT - 50);
        expect(elapsed).toBeLessThan(TAGGED_CACHE_CONNECT_TIMEOUT + 1000);
        expect(onError).toHaveBeenCalled();

        await dispose();
    });

    it('ready settles at once for a disposed client', async () => {
        const { ready, dispose } = createTaggedCache({ redis: 'redis://127.0.0.1:1', onError: vi.fn() });

        await dispose();

        const startedAt = Date.now();

        await expect(ready()).resolves.toBeUndefined();
        expect(Date.now() - startedAt).toBeLessThan(TAGGED_CACHE_CONNECT_TIMEOUT);
    });

    it('CacheModule registers both tokens', async () => {
        const container = new Container();

        container.register(ConfigInjectionKey, { useValue: await normalizeConfig({ redis: false }) });

        const module = new CacheModule();

        await module.setup(container);

        expect(container.resolve(CacheInjectionKey)).toBeDefined();
        expect(container.resolve(TaggedCacheInjectionKey)).toBeDefined();

        await module.teardown();
    });

    it('CacheModule logs one warn line for repeated failures', async () => {
        const lines: string[] = [];
        const logger = createNoopLogger();

        logger.warn = ((message: unknown) => {
            lines.push(String(message));

            return logger;
        }) as Logger['warn'];

        const container = new Container();

        container.register(ConfigInjectionKey, { useValue: await normalizeConfig({ redis: 'redis://127.0.0.1:1' }) });
        container.register(LoggerInjectionKey, { useValue: logger });

        const module = new CacheModule();

        await module.setup(container);

        const cache = container.resolve(TaggedCacheInjectionKey);

        await cache.remember('k', async () => 'value', { tags: () => ['t'] });
        await cache.remember('k', async () => 'value', { tags: () => ['t'] });

        await module.teardown();

        expect(lines).toHaveLength(1);
        expect(lines[0]).toMatch(/^The tagged cache failed: /);
    });

    it('throttle calls once per window and again after it', () => {
        let time = 0;
        const fn = vi.fn();
        const throttled = throttle(fn, 10_000, () => time);

        throttled('a');
        throttled('b');
        time = 9_999;
        throttled('c');
        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenLastCalledWith('a');

        time = 10_000;
        throttled('d');
        throttled('e');
        expect(fn).toHaveBeenCalledTimes(2);
        expect(fn).toHaveBeenLastCalledWith('d');
    });

    it('two throttles keep separate windows', () => {
        const a = vi.fn();
        const b = vi.fn();
        const throttledA = throttle(a, 10_000, () => 0);
        const throttledB = throttle(b, 10_000, () => 0);

        throttledA();
        throttledB();
        throttledA();

        expect(a).toHaveBeenCalledTimes(1);
        expect(b).toHaveBeenCalledTimes(1);
    });

    it.skipIf(!process.env.TEST_REDIS_URL)('CacheModule serves the first read after setup from redis', async () => {
        const container = new Container();

        container.register(ConfigInjectionKey, { useValue: await normalizeConfig({ redis: buildTestRedisOptions('setup') }) });

        const module = new CacheModule();

        await module.setup(container);

        const cache = container.resolve(TaggedCacheInjectionKey);
        const read = vi.fn(async () => 'value');
        const key = `setup-${Date.now()}`;

        await cache.remember(key, read, { tags: () => ['t'] });
        await cache.remember(key, read, { tags: () => ['t'] });

        await module.teardown();

        expect(read).toHaveBeenCalledTimes(1);
    });

    it.skipIf(!process.env.TEST_REDIS_URL)('two keyPrefixes on one redis do not share entries', async () => {
        const build = (name: string) => createTaggedCache({
            redis: buildTestRedisOptions(name) as RedisOptions,
            onError: vi.fn(),
        });

        const a = build('isolation-a');
        const b = build('isolation-b');

        await Promise.all([a.ready(), b.ready()]);

        const key = `isolation-${Date.now()}`;

        await a.cache.remember(key, async () => 'a', { tags: () => ['t'] });

        const read = vi.fn(async () => 'b');

        await expect(b.cache.remember(key, read, { tags: () => ['t'] })).resolves.toEqual('b');
        await expect(a.cache.remember(key, async () => 'other', { tags: () => ['t'] })).resolves.toEqual('a');
        expect(read).toHaveBeenCalledTimes(1);

        await a.dispose();
        await b.dispose();
    });
});
