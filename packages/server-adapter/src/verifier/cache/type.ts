/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from 'redis-extension';
import type { TokenVerificationData } from '../type';

export interface TokenVerifierCache {
    get(token: string) : Promise<TokenVerificationData | undefined>;
    set(token: string, data: TokenVerificationData, seconds?: number) : Promise<void>;
}

export type TokenVerifierRedisCacheOptions = {
    type: 'redis',
    client?: Client | string
};

export type TokenVerifierMemoryCacheOptions = {
    type: 'memory',
    /**
     * default: 60.000ms (60s)
     */
    intervalMs?: number
};

export type TokenVerifierCacheOptions = TokenVerifierRedisCacheOptions | TokenVerifierMemoryCacheOptions;
