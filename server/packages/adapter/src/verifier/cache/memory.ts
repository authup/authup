/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { setInterval } from 'node:timers';
import type { TokenVerificationData } from '../type';
import type { TokenVerifierCache } from './type';

export class TokenVerifierMemoryCache implements TokenVerifierCache {
    protected interval : ReturnType<typeof setInterval>;

    protected cache: Record<string, TokenVerificationData>;

    constructor(windowMs?: number) {
        this.cache = {};

        this.interval = setInterval(() => {
            /* istanbul ignore next */
            this.cache = {};
        }, windowMs || (1000 * 60));

        if (this.interval.unref) {
            this.interval.unref();
        }
    }

    async get(token: string): Promise<TokenVerificationData | undefined> {
        return this.cache[token];
    }

    async set(token: string, data: TokenVerificationData): Promise<void> {
        this.cache[token] = data;
    }
}
