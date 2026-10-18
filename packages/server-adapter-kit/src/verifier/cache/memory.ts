/*
 * Copyright (c) 2023-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TTLCache } from '@isaacs/ttlcache';
import type { TokenVerificationData } from '../types';
import type { IVerifierCache, MemoryVerifierCacheEntry } from './types';

export class MemoryVerifierCache implements IVerifierCache {
    protected driver : TTLCache<string, MemoryVerifierCacheEntry>;

    constructor() {
        this.driver = new TTLCache({ checkAgeOnGet: true });
    }

    async getToken(token: string): Promise<TokenVerificationData | undefined> {
        const entry = this.driver.get(`token:${token}`);
        return entry?.data;
    }

    async setToken(token: string, data: TokenVerificationData, seconds: number): Promise<void> {
        this.driver.set(`token:${token}`, { data }, { ttl: seconds * 1000 });
    }
}
