/*
 * Copyright (c) 2023-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createHash } from 'node:crypto';
import type { Client } from 'redis-extension';
import { JsonAdapter, createClient } from 'redis-extension';
import type { JWKCacheData, JWKCacheKey } from '../jwk';
import type { TokenVerificationData } from '../types';
import { MemoryVerifierCache } from './memory';
import type { IVerifierCache } from './types';

export class RedisVerifierCache implements IVerifierCache {
    protected instance : JsonAdapter;

    // a CryptoKey cannot be serialized, so keys stay in process memory
    protected memory : MemoryVerifierCache;

    constructor(input?: Client | string) {
        let client: Client;

        if (!input) {
            client = createClient();
        } else if (typeof input === 'string') {
            client = createClient({ connectionString: input });
        } else {
            client = input;
        }

        this.instance = new JsonAdapter(client);
        this.memory = new MemoryVerifierCache();
    }

    getToken(token: string): Promise<TokenVerificationData | undefined> {
        return this.instance.get(this.buildKey(token));
    }

    setToken(token: string, data: TokenVerificationData, seconds: number): Promise<void> {
        return this.instance.set(
            this.buildKey(token),
            data,
            { seconds },
        );
    }

    getJwk(key: JWKCacheKey): Promise<JWKCacheData | undefined> {
        return this.memory.getJwk(key);
    }

    setJwk(key: JWKCacheKey, entry: JWKCacheData, seconds: number): Promise<void> {
        return this.memory.setJwk(key, entry, seconds);
    }

    protected buildKey(token: string) {
        const hash = createHash('sha256').update(token).digest('hex');
        return `token:${hash}`;
    }
}
