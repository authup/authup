/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICache } from '@authup/server-kit';
import { buildCacheKey } from '@authup/server-kit';
import type {
    IOAuth2DeviceCodeRepository,
    OAuth2DeviceCode,
    OAuth2DeviceCodeDecision,
    OAuth2DeviceCodeRequest,
} from '../../../../../core/index.ts';
import {
    OAUTH2_DEVICE_CODE_GRACE,
    OAUTH2_DEVICE_CODE_INTERVAL,
    OAUTH2_DEVICE_CODE_MAX_AGE,
    OAUTH2_DEVICE_LOOKUP_ATTEMPT_WINDOW,
    OAuth2DeviceCodeStatus,
} from '../../../../../core/index.ts';
import { CacheOAuth2Prefix } from '../constants.ts';

export class OAuth2DeviceCodeRepository implements IOAuth2DeviceCodeRepository {
    protected cache : ICache;

    constructor(cache: ICache) {
        this.cache = cache;
    }

    async save(entity: OAuth2DeviceCodeRequest): Promise<boolean> {
        if (entity.expires_at - this.now() <= 0) {
            return false;
        }

        const added = await this.cache.add(
            this.buildUserCodeKey(entity.user_code),
            entity.id,
            { ttl: OAUTH2_DEVICE_CODE_MAX_AGE * 1000 },
        );
        if (!added) {
            return false;
        }

        await this.cache.set(
            this.buildCodeKey(entity.id),
            entity,
            { ttl: (OAUTH2_DEVICE_CODE_MAX_AGE + OAUTH2_DEVICE_CODE_GRACE) * 1000 },
        );

        return true;
    }

    async findOneById(id: string): Promise<OAuth2DeviceCode | null> {
        const request = await this.cache.get<OAuth2DeviceCodeRequest>(this.buildCodeKey(id));
        if (!request) {
            return null;
        }

        const decision = await this.cache.get<OAuth2DeviceCodeDecision>(this.buildDecisionKey(id));

        return this.merge(request, decision);
    }

    async findOneByUserCode(userCode: string): Promise<OAuth2DeviceCode | null> {
        const id = await this.cache.get<string>(this.buildUserCodeKey(userCode));
        if (!id) {
            return null;
        }

        return this.findOneById(id);
    }

    async popOneById(id: string): Promise<OAuth2DeviceCode | null> {
        const request = await this.cache.pop<OAuth2DeviceCodeRequest>(this.buildCodeKey(id));
        if (!request) {
            return null;
        }

        const decision = await this.cache.pop<OAuth2DeviceCodeDecision>(this.buildDecisionKey(id));
        await this.cache.drop(this.buildPollKey(id));

        return this.merge(request, decision);
    }

    async removeById(id: string): Promise<void> {
        await this.cache.dropMany([
            this.buildCodeKey(id),
            this.buildDecisionKey(id),
            this.buildPollKey(id),
        ]);
    }

    async decide(id: string, decision: OAuth2DeviceCodeDecision, expiresAt: number): Promise<boolean> {
        const remaining = expiresAt - this.now();
        if (remaining <= 0) {
            return false;
        }

        return this.cache.add(
            this.buildDecisionKey(id),
            decision,
            { ttl: (remaining + OAUTH2_DEVICE_CODE_GRACE) * 1000 },
        );
    }

    async removeUserCode(userCode: string): Promise<void> {
        await this.cache.drop(this.buildUserCodeKey(userCode));
    }

    // ponytail: the poll window is FIXED at OAUTH2_DEVICE_CODE_INTERVAL, never
    // escalating. RFC 8628 3.5 makes the client add 5 s on slow_down; the
    // server only refuses, so a refused add leaves the standing window and an
    // abusive client is bounded to one accepted poll per window plus one cache
    // add per poll, which the IP rate limiter already caps. Upgrade path: a
    // per-code counter (increment with the blob's retention) widening the
    // window to min(60, 5 + 5 * n) if a fleet of misbehaving devices ever
    // makes the cache round-trip itself the cost.
    async touchPoll(id: string): Promise<boolean> {
        return this.cache.add(
            this.buildPollKey(id),
            1,
            { ttl: OAUTH2_DEVICE_CODE_INTERVAL * 1000 },
        );
    }

    async lookupThrottle(key: string): Promise<number | null> {
        const deadline = await this.cache.get<number>(this.buildLookupLockKey(key));
        if (typeof deadline !== 'number') {
            return null;
        }

        const remaining = deadline - this.now();

        return remaining > 0 ? remaining : null;
    }

    // ponytail: misses are throttled per ACTOR only (the mfaAttempt /
    // mfaThrottle pair). An attacker holding many accounts in one realm gets
    // the limit per account per window against a 34.6-bit space, and every
    // guess is bearer-gated, so the work is bounded by accounts held, not by
    // codes. Upgrade path: a second code:<canonical> counter with a lower
    // limit, armed only when the canonical code is non-null, if a distributed
    // guess across many accounts is ever a concern.
    async countLookupMiss(key: string, limit: number): Promise<void> {
        const count = await this.cache.increment(
            this.buildLookupAttemptKey(key),
            1,
            { ttl: OAUTH2_DEVICE_LOOKUP_ATTEMPT_WINDOW * 1000 },
        );

        if (count >= limit) {
            await this.cache.set(
                this.buildLookupLockKey(key),
                this.now() + OAUTH2_DEVICE_LOOKUP_ATTEMPT_WINDOW,
                { ttl: OAUTH2_DEVICE_LOOKUP_ATTEMPT_WINDOW * 1000 },
            );
        }
    }

    protected merge(request: OAuth2DeviceCodeRequest, decision: OAuth2DeviceCodeDecision | null): OAuth2DeviceCode {
        return {
            ...request,
            status: decision?.status ?? OAuth2DeviceCodeStatus.PENDING,
            decision: decision ?? null,
        };
    }

    protected now(): number {
        return Math.floor(Date.now() / 1000);
    }

    protected buildCodeKey(id: string): string {
        return buildCacheKey({ prefix: CacheOAuth2Prefix.DEVICE_CODE, key: id });
    }

    protected buildUserCodeKey(userCode: string): string {
        return buildCacheKey({ prefix: CacheOAuth2Prefix.DEVICE_USER_CODE, key: userCode });
    }

    protected buildDecisionKey(id: string): string {
        return buildCacheKey({ prefix: CacheOAuth2Prefix.DEVICE_DECISION, key: id });
    }

    protected buildPollKey(id: string): string {
        return buildCacheKey({ prefix: CacheOAuth2Prefix.DEVICE_POLL, key: id });
    }

    protected buildLookupAttemptKey(key: string): string {
        return buildCacheKey({ prefix: CacheOAuth2Prefix.DEVICE_LOOKUP_ATTEMPT, key });
    }

    protected buildLookupLockKey(key: string): string {
        return buildCacheKey({ prefix: CacheOAuth2Prefix.DEVICE_LOOKUP_ATTEMPT, key: `lock:${key}` });
    }
}
