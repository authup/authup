/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import type { CacheClearOptions, CacheSetOptions, ICache } from '@authup/server-kit';
import { MemoryCache, buildCacheKey } from '@authup/server-kit';
import { OAuth2SubKind } from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import type { OAuth2DeviceCodeRequest } from '../../../../../src/core/index.ts';
import {
    OAUTH2_DEVICE_CODE_GRACE,
    OAUTH2_DEVICE_CODE_INTERVAL,
    OAUTH2_DEVICE_CODE_MAX_AGE,
    OAUTH2_DEVICE_LOOKUP_ATTEMPT_WINDOW,
    OAuth2DeviceCodeStatus,
} from '../../../../../src/core/index.ts';
import { CacheOAuth2Prefix } from '../../../../../src/app/modules/oauth2/repositories/constants.ts';
import { OAuth2DeviceCodeRepository } from '../../../../../src/app/modules/oauth2/repositories/device-code/repository.ts';

type CacheRecord = {
    method: 'set' | 'add' | 'increment',
    key: string,
    ttl: number | undefined,
};

class RecordingCache implements ICache {
    public records: CacheRecord[] = [];

    public dropped: string[] = [];

    protected inner : ICache;

    constructor(inner: ICache) {
        this.inner = inner;
    }

    async set(key: string, value: any, options?: CacheSetOptions): Promise<void> {
        this.records.push({
            method: 'set', 
            key, 
            ttl: options?.ttl, 
        });
        return this.inner.set(key, value, options);
    }

    async add(key: string, value: any, options?: CacheSetOptions): Promise<boolean> {
        this.records.push({
            method: 'add', 
            key, 
            ttl: options?.ttl, 
        });
        return this.inner.add(key, value, options);
    }

    async renewIfValue(key: string, value: string, ttl: number): Promise<boolean> {
        return this.inner.renewIfValue(key, value, ttl);
    }

    async dropIfValue(key: string, value: string): Promise<boolean> {
        return this.inner.dropIfValue(key, value);
    }

    async increment(key: string, value?: number, options?: CacheSetOptions): Promise<number> {
        this.records.push({
            method: 'increment', 
            key, 
            ttl: options?.ttl, 
        });
        return this.inner.increment(key, value, options);
    }

    async has(key: string): Promise<boolean> {
        return this.inner.has(key);
    }

    async get<T = unknown>(key: string): Promise<T | null> {
        return this.inner.get<T>(key);
    }

    async pop<T = unknown>(key: string): Promise<T | null> {
        return this.inner.pop<T>(key);
    }

    async drop(key: string): Promise<void> {
        this.dropped.push(key);
        return this.inner.drop(key);
    }

    async dropMany(keys: string[]): Promise<void> {
        this.dropped.push(...keys);
        return this.inner.dropMany(keys);
    }

    async clear(options?: CacheClearOptions): Promise<void> {
        return this.inner.clear(options);
    }
}

const now = () => Math.floor(Date.now() / 1000);

const buildRequest = (input: Partial<OAuth2DeviceCodeRequest> = {}) : OAuth2DeviceCodeRequest => ({
    id: randomBytes(32).toString('hex'),
    user_code: 'BCDFGHJK',
    client_id: randomUUID(),
    realm_id: randomUUID(),
    realm_name: 'master',
    scope: 'global openid',
    expires_at: now() + OAUTH2_DEVICE_CODE_MAX_AGE,
    ...input,
});

const keyOf = (prefix: CacheOAuth2Prefix, key: string) => buildCacheKey({ prefix, key });

describe('app/modules/oauth2/repositories/device-code', () => {
    let cache : RecordingCache;
    let repository : OAuth2DeviceCodeRepository;

    beforeEach(() => {
        cache = new RecordingCache(new MemoryCache());
        repository = new OAuth2DeviceCodeRepository(cache);
    });

    it('should write the index and the blob with their ttls in milliseconds', async () => {
        const request = buildRequest();

        expect(await repository.save(request)).toBe(true);

        expect(cache.records).toEqual([
            {
                method: 'add',
                key: keyOf(CacheOAuth2Prefix.DEVICE_USER_CODE, request.user_code),
                ttl: OAUTH2_DEVICE_CODE_MAX_AGE * 1000,
            },
            {
                method: 'set',
                key: keyOf(CacheOAuth2Prefix.DEVICE_CODE, request.id),
                ttl: (OAUTH2_DEVICE_CODE_MAX_AGE + OAUTH2_DEVICE_CODE_GRACE) * 1000,
            },
        ]);
        expect(cache.records[0].ttl).toEqual(600_000);
        expect(cache.records[1].ttl).toEqual(900_000);

        const entity = await repository.findOneById(request.id);
        expect(entity).toEqual({
            ...request,
            status: OAuth2DeviceCodeStatus.PENDING,
            decision: null,
        });
    });

    it('should refuse a user_code collision and write nothing else', async () => {
        const first = buildRequest();
        const second = buildRequest({ user_code: first.user_code });

        expect(await repository.save(first)).toBe(true);
        cache.records = [];

        expect(await repository.save(second)).toBe(false);

        expect(cache.records).toHaveLength(1);
        expect(cache.records[0].method).toEqual('add');
        expect(await repository.findOneById(second.id)).toBeNull();
        expect(await repository.findOneByUserCode(first.user_code)).toEqual(expect.objectContaining({ id: first.id }));
    });

    it('should refuse an already expired request and write nothing', async () => {
        const request = buildRequest({ expires_at: now() - 1 });

        expect(await repository.save(request)).toBe(false);

        expect(cache.records).toHaveLength(0);
        expect(await repository.findOneById(request.id)).toBeNull();
        expect(await repository.findOneByUserCode(request.user_code)).toBeNull();
    });

    it('should merge the decision into the user-code read', async () => {
        const request = buildRequest();
        await repository.save(request);

        const decision = {
            status: OAuth2DeviceCodeStatus.APPROVED,
            sub: randomUUID(),
            sub_kind: OAuth2SubKind.USER,
            session_id: randomUUID(),
            auth_time: now(),
            auth_method: 'pwd',
        } as const;

        cache.records = [];
        expect(await repository.decide(request.id, decision, request.expires_at)).toBe(true);

        expect(cache.records).toHaveLength(1);
        expect(cache.records[0].method).toEqual('add');
        expect(cache.records[0].key).toEqual(keyOf(CacheOAuth2Prefix.DEVICE_DECISION, request.id));
        const remaining = request.expires_at - now();
        expect(cache.records[0].ttl).toBeGreaterThanOrEqual((remaining - 1 + OAUTH2_DEVICE_CODE_GRACE) * 1000);
        expect(cache.records[0].ttl).toBeLessThanOrEqual((remaining + OAUTH2_DEVICE_CODE_GRACE) * 1000);

        const entity = await repository.findOneByUserCode(request.user_code);
        expect(entity).toEqual({
            ...request,
            status: OAuth2DeviceCodeStatus.APPROVED,
            decision,
        });
    });

    it('should write a decision once', async () => {
        const request = buildRequest();
        await repository.save(request);

        expect(await repository.decide(request.id, { status: OAuth2DeviceCodeStatus.DENIED }, request.expires_at)).toBe(true);
        expect(await repository.decide(request.id, {
            status: OAuth2DeviceCodeStatus.APPROVED,
            sub: randomUUID(),
            sub_kind: OAuth2SubKind.USER,
            session_id: null,
            auth_time: now(),
            auth_method: null,
        }, request.expires_at)).toBe(false);

        const entity = await repository.findOneById(request.id);
        expect(entity?.status).toEqual(OAuth2DeviceCodeStatus.DENIED);
        expect(entity?.decision).toEqual({ status: OAuth2DeviceCodeStatus.DENIED });
    });

    it('should refuse a decision whose remaining ttl is not positive', async () => {
        const request = buildRequest();
        await repository.save(request);
        cache.records = [];

        expect(await repository.decide(request.id, { status: OAuth2DeviceCodeStatus.DENIED }, now())).toBe(false);
        expect(await repository.decide(request.id, { status: OAuth2DeviceCodeStatus.DENIED }, now() - 30)).toBe(false);

        expect(cache.records).toHaveLength(0);
        expect((await repository.findOneById(request.id))?.decision).toBeNull();
    });

    it('should pop the blob together with the decision and poll keys', async () => {
        const request = buildRequest();
        await repository.save(request);
        await repository.decide(request.id, { status: OAuth2DeviceCodeStatus.DENIED }, request.expires_at);
        expect(await repository.touchPoll(request.id)).toBe(true);

        const popped = await repository.popOneById(request.id);
        expect(popped).toEqual({
            ...request,
            status: OAuth2DeviceCodeStatus.DENIED,
            decision: { status: OAuth2DeviceCodeStatus.DENIED },
        });

        expect(await cache.has(keyOf(CacheOAuth2Prefix.DEVICE_CODE, request.id))).toBe(false);
        expect(await cache.has(keyOf(CacheOAuth2Prefix.DEVICE_DECISION, request.id))).toBe(false);
        expect(await cache.has(keyOf(CacheOAuth2Prefix.DEVICE_POLL, request.id))).toBe(false);

        expect(await repository.popOneById(request.id)).toBeNull();
        expect(await repository.findOneById(request.id)).toBeNull();
    });

    it('should remove the blob together with the decision and poll keys without a read', async () => {
        const request = buildRequest();
        await repository.save(request);
        await repository.decide(request.id, { status: OAuth2DeviceCodeStatus.DENIED }, request.expires_at);
        await repository.touchPoll(request.id);

        await repository.removeById(request.id);

        expect(await cache.has(keyOf(CacheOAuth2Prefix.DEVICE_CODE, request.id))).toBe(false);
        expect(await cache.has(keyOf(CacheOAuth2Prefix.DEVICE_DECISION, request.id))).toBe(false);
        expect(await cache.has(keyOf(CacheOAuth2Prefix.DEVICE_POLL, request.id))).toBe(false);
        expect(await repository.findOneById(request.id)).toBeNull();
    });

    it('should drop the user-code index alone', async () => {
        const request = buildRequest();
        await repository.save(request);

        await repository.removeUserCode(request.user_code);

        expect(await repository.findOneByUserCode(request.user_code)).toBeNull();
        expect(await repository.findOneById(request.id)).toEqual(expect.objectContaining({ id: request.id }));
    });

    it('should refuse a poll inside the fixed window and accept one once the key lapsed', async () => {
        const request = buildRequest();
        await repository.save(request);
        cache.records = [];

        expect(await repository.touchPoll(request.id)).toBe(true);
        expect(await repository.touchPoll(request.id)).toBe(false);
        expect(await repository.touchPoll(request.id)).toBe(false);

        expect(cache.records).toHaveLength(3);
        for (const record of cache.records) {
            expect(record).toEqual({
                method: 'add',
                key: keyOf(CacheOAuth2Prefix.DEVICE_POLL, request.id),
                ttl: OAUTH2_DEVICE_CODE_INTERVAL * 1000,
            });
            expect(record.ttl).toEqual(5_000);
        }

        await cache.drop(keyOf(CacheOAuth2Prefix.DEVICE_POLL, request.id));

        expect(await repository.touchPoll(request.id)).toBe(true);
        expect(cache.records[3].ttl).toEqual(OAUTH2_DEVICE_CODE_INTERVAL * 1000);
    });

    it('should count misses per key and arm the lock at the limit', async () => {
        const key = `actor:${randomUUID()}`;
        const other = `actor:${randomUUID()}`;

        expect(await repository.lookupThrottle(key)).toBeNull();

        for (let i = 0; i < 9; i++) {
            await repository.countLookupMiss(key, 10);
            expect(await repository.lookupThrottle(key)).toBeNull();
        }

        expect(cache.records).toHaveLength(9);
        for (const record of cache.records) {
            expect(record).toEqual({
                method: 'increment',
                key: keyOf(CacheOAuth2Prefix.DEVICE_LOOKUP_ATTEMPT, key),
                ttl: OAUTH2_DEVICE_LOOKUP_ATTEMPT_WINDOW * 1000,
            });
            expect(record.ttl).toEqual(600_000);
        }

        await repository.countLookupMiss(key, 10);

        expect(cache.records).toHaveLength(11);
        expect(cache.records[10]).toEqual({
            method: 'set',
            key: keyOf(CacheOAuth2Prefix.DEVICE_LOOKUP_ATTEMPT, `lock:${key}`),
            ttl: OAUTH2_DEVICE_LOOKUP_ATTEMPT_WINDOW * 1000,
        });

        const retryAfter = await repository.lookupThrottle(key);
        expect(retryAfter).toBeGreaterThan(0);
        expect(retryAfter).toBeLessThanOrEqual(OAUTH2_DEVICE_LOOKUP_ATTEMPT_WINDOW);

        expect(await repository.lookupThrottle(other)).toBeNull();
    });

    it('should forgive the counter once per window and leave the lock alone', async () => {
        const key = `actor:${randomUUID()}`;
        const locked = `actor:${randomUUID()}`;

        for (let i = 0; i < 9; i++) {
            await repository.countLookupMiss(key, 10);
        }

        cache.records = [];
        await repository.resetLookupMisses(key);

        // the marker's ttl is what bounds the forgiveness to one per window,
        // and it is handed over in milliseconds like every other key here
        expect(cache.records).toEqual([{
            method: 'add',
            key: keyOf(CacheOAuth2Prefix.DEVICE_LOOKUP_ATTEMPT, `reset:${key}`),
            ttl: OAUTH2_DEVICE_LOOKUP_ATTEMPT_WINDOW * 1000,
        }]);
        cache.records = [];

        await repository.countLookupMiss(key, 10);
        expect(await repository.lookupThrottle(key)).toBeNull();

        // the second reset in the window adds nothing, so the counter keeps
        // running and the tenth miss behind it arms the lock
        await repository.resetLookupMisses(key);
        for (let i = 0; i < 9; i++) {
            await repository.countLookupMiss(key, 10);
        }

        expect(await repository.lookupThrottle(key)).toBeGreaterThan(0);
        expect(cache.records).toContainEqual({
            method: 'set',
            key: keyOf(CacheOAuth2Prefix.DEVICE_LOOKUP_ATTEMPT, `lock:${key}`),
            ttl: OAUTH2_DEVICE_LOOKUP_ATTEMPT_WINDOW * 1000,
        });

        for (let i = 0; i < 10; i++) {
            await repository.countLookupMiss(locked, 10);
        }

        await repository.resetLookupMisses(locked);

        expect(await repository.lookupThrottle(locked)).toBeGreaterThan(0);
    });

    it('should spend no forgiveness when there is nothing to forgive', async () => {
        const key = `actor:${randomUUID()}`;

        await repository.resetLookupMisses(key);

        expect(cache.records).toEqual([]);

        // so the first real reset in the window still wins
        for (let i = 0; i < 9; i++) {
            await repository.countLookupMiss(key, 10);
        }
        await repository.resetLookupMisses(key);
        await repository.countLookupMiss(key, 10);

        expect(await repository.lookupThrottle(key)).toBeNull();
    });
});
