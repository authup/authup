/*
 * Copyright (c) 2023-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWKCacheData, JWKCacheKey } from '../jwk';
import type { TokenVerificationData } from '../types';

export interface IVerifierCache {
    getToken(token: string) : Promise<TokenVerificationData | undefined>;
    setToken(token: string, data: TokenVerificationData, seconds: number) : Promise<void>;
    getJwk(key: JWKCacheKey) : Promise<JWKCacheData | undefined>;
    setJwk(key: JWKCacheKey, entry: JWKCacheData, seconds: number) : Promise<void>;
}

export type MemoryVerifierCacheEntryToken = {
    type: 'token',
    data: TokenVerificationData
};

export type MemoryVerifierCacheEntryJwk = {
    type: 'jwk',
    data: {
        key: CryptoKey,
        algorithm?: string,
    }
};

export type MemoryVerifierCacheEntry = MemoryVerifierCacheEntryToken | MemoryVerifierCacheEntryJwk;
