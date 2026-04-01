/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TTLCache } from '@isaacs/ttlcache';
import type { TokenVerificationData } from '../types';
import type { ITokenVerifierCache } from './types';

export class MemoryTokenVerifierCache implements ITokenVerifierCache {
    protected driver : TTLCache<string, TokenVerificationData>;

    constructor() {
        this.driver = new TTLCache();
    }

    async get(token: string): Promise<TokenVerificationData | undefined> {
        return this.driver.get(token);
    }

    async set(token: string, data: TokenVerificationData, seconds: number): Promise<void> {
        this.driver.set(token, data, {
            ttl: seconds * 1000 
        });
    }
}
