/*
 * Copyright (c) 2023-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TTLCache } from '@isaacs/ttlcache';
import type { JWKCacheData, JWKCacheKey } from '../jwk';
import type { TokenVerificationData } from '../types';
import type { IVerifierCache, MemoryVerifierCacheEntry } from './types';

export class MemoryVerifierCache implements IVerifierCache {
    protected driver : TTLCache<string, MemoryVerifierCacheEntry>;

    constructor() {
        this.driver = new TTLCache({ checkAgeOnGet: true });
    }

    async getToken(token: string): Promise<TokenVerificationData | undefined> {
        const entry = this.driver.get(`token:${token}`);
        if (!entry || entry.type !== 'token') {
            return undefined;
        }

        return entry.data;
    }

    async setToken(token: string, data: TokenVerificationData, seconds: number): Promise<void> {
        this.driver.set(`token:${token}`, {
            data,
            type: 'token',
        }, { ttl: seconds * 1000 });
    }

    async getJwk(key: JWKCacheKey): Promise<JWKCacheData | undefined> {
        const entry = this.driver.get(`jwk:${key.realmId}:${key.kid}`);
        if (!entry || entry.type !== 'jwk') {
            return undefined;
        }

        return entry.data;
    }

    async setJwk(key: JWKCacheKey, data: JWKCacheData, seconds: number): Promise<void> {
        this.driver.set(`jwk:${key.realmId}:${key.kid}`, {
            data,
            type: 'jwk',
        }, { ttl: seconds * 1000 });
    }
}
