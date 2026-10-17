/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type JWKCacheOptions = {
    /**
     * Seconds a resolved key stays cached. Default 300.
     */
    ttl?: number,
    /**
     * Maximum cached keys; the oldest inserted is evicted first. Default 100.
     */
    max?: number,
};

export type JWKCacheKey = {
    realmId: string,
    kid: string,
};

export type JWKCacheEntry = {
    key: CryptoKey,
    algorithm?: string,
};
