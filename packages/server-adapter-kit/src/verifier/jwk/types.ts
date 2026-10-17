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
     * Seconds a key fetch may take before it fails and the next
     * lookup starts a fresh one. Default 10.
     */
    timeout?: number,
};

export type JWKCacheKey = {
    realmId: string,
    kid: string,
};

export type JWKCacheData = {
    key: CryptoKey,
    algorithm?: string,
};
