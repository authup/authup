/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICache } from '@authup/server-kit';
import { buildCacheKey } from '@authup/server-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { randomUUID } from 'node:crypto';
import type { IOAuth2TokenRepository } from '../../../../../core/index.ts';
import { CacheOAuth2Prefix } from '../constants.ts';

// The ttl a cached payload gets when its token carries no usable `exp`.
const CLAIMS_FALLBACK_TTL = 3_600 * 1000;

export type OAuth2TokenRepositoryOptions = {
    /**
     * The longest lifetime (in seconds) of a token this server issues.
     */
    keyInactiveMaxAge?: number,
};

export class OAuth2TokenRepository implements IOAuth2TokenRepository {
    protected cache : ICache;

    protected options : OAuth2TokenRepositoryOptions;

    constructor(cache: ICache, options: OAuth2TokenRepositoryOptions = {}) {
        this.cache = cache;
        this.options = options;
    }

    // -----------------------------------------------------

    async findOneBySignature(signature: string): Promise<OAuth2TokenPayload | null> {
        return this.cache.get<OAuth2TokenPayload>(
            buildCacheKey({
                prefix: CacheOAuth2Prefix.TOKEN_CLAIMS,
                key: signature, 
            }),
        );
    }

    async setKeyInactive(kid: string): Promise<void> {
        // A payload cached by signature lives until its token's `exp` (or the
        // fallback), so the mark only has to outlive the longest token.
        await this.cache.set(
            buildCacheKey({
                prefix: CacheOAuth2Prefix.KEY_INACTIVE,
                key: kid,
            }),
            true,
            {
                ttl: Math.max(
                    (this.options.keyInactiveMaxAge ?? 0) * 1000,
                    CLAIMS_FALLBACK_TTL,
                ),
            },
        );
    }

    async dropKeyInactive(kid: string): Promise<void> {
        await this.cache.drop(
            buildCacheKey({
                prefix: CacheOAuth2Prefix.KEY_INACTIVE,
                key: kid,
            }),
        );
    }

    async isKeyInactive(kid: string): Promise<boolean> {
        return this.cache.has(
            buildCacheKey({
                prefix: CacheOAuth2Prefix.KEY_INACTIVE,
                key: kid,
            }),
        );
    }

    async findOneById(id: string): Promise<OAuth2TokenPayload | null> {
        return this.cache.get<OAuth2TokenPayload>(
            buildCacheKey({
                prefix: CacheOAuth2Prefix.TOKEN,
                key: id, 
            }),
        );
    }

    // -----------------------------------------------------

    async removeById(id: string): Promise<void> {
        const token = await this.findOneById(id);
        if (!token) {
            return;
        }

        const key = buildCacheKey({
            prefix: CacheOAuth2Prefix.TOKEN,
            key: id, 
        });
        await this.cache.drop(key);

        await this.setInactive(id, token.exp);
    }

    // -----------------------------------------------------

    async insert(payload: OAuth2TokenPayload): Promise<OAuth2TokenPayload> {
        payload.jti = randomUUID();

        await this.cache.set(
            buildCacheKey({
                prefix: CacheOAuth2Prefix.TOKEN,
                key: payload.jti, 
            }),
            payload,
            { ttl: this.buildTTL(payload.exp) },
        );

        return payload;
    }

    async save(payload: OAuth2TokenPayload): Promise<OAuth2TokenPayload> {
        if (payload.jti) {
            return payload;
        }

        return this.insert(payload);
    }

    async saveWithSignature(data: OAuth2TokenPayload, signature: string): Promise<OAuth2TokenPayload> {
        const normalized = await this.save(data);

        await this.cache.set(
            buildCacheKey({
                prefix: CacheOAuth2Prefix.TOKEN_CLAIMS,
                key: signature, 
            }),
            normalized,
            { ttl: this.buildTTL(data.exp) },
        );

        return normalized;
    }

    // -----------------------------------------------------

    async isInactive(key: string): Promise<boolean> {
        const cacheKey = buildCacheKey({
            prefix: CacheOAuth2Prefix.TOKEN_INACTIVE,
            key,
        });

        const response = await this.cache.get(cacheKey);

        return !!response;
    }

    async setInactive(key: string, exp?: number): Promise<void> {
        const ttl = this.buildTTL(exp);

        const cacheKey = buildCacheKey({
            prefix: CacheOAuth2Prefix.TOKEN_INACTIVE,
            key,
        });

        await this.cache.set(
            cacheKey,
            true,
            { ttl },
        );
    }

    async claimInactive(key: string, exp?: number): Promise<boolean> {
        const ttl = this.buildTTL(exp);

        const cacheKey = buildCacheKey({
            prefix: CacheOAuth2Prefix.TOKEN_INACTIVE,
            key,
        });

        // set-if-absent (Redis SET NX / single-tick memory adapter) — returns
        // true only for the caller that actually transitioned the token to
        // inactive, so concurrent single-use claims cannot both succeed.
        return this.cache.add(
            cacheKey,
            true,
            { ttl },
        );
    }

    // -----------------------------------------------------

    /**
     * Transform timestamp in seconds to ttl in ms.
     *
     * @param utc
     * @protected
     */
    protected buildTTL(utc?: number) {
        if (typeof utc === 'number') {
            const ttl = (utc * 1000) - Date.now();
            if (ttl > 0) {
                return ttl;
            }
        }

        return CLAIMS_FALLBACK_TTL;
    }
}
