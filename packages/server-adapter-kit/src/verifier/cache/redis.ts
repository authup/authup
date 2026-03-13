/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from 'redis-extension';
import { JsonAdapter, createClient } from 'redis-extension';
import type { TokenVerificationData } from '../types';
import type { ITokenVerifierCache } from './types';

export class RedisTokenVerifierCache implements ITokenVerifierCache {
    protected instance : JsonAdapter;

    constructor(input?: Client | string) {
        let client: Client;

        if (!input) {
            client = createClient();
        } else if (typeof input === 'string') {
            client = createClient({
                connectionString: input,
            });
        } else {
            client = input;
        }

        this.instance = new JsonAdapter(client);
    }

    get(token: string): Promise<TokenVerificationData | undefined> {
        return this.instance.get(this.buildKey(token));
    }

    set(token: string, data: TokenVerificationData, seconds: number): Promise<void> {
        return this.instance.set(
            this.buildKey(token),
            data,
            {
                seconds,
            },
        );
    }

    protected buildKey(key: string) {
        return `token:${key}`;
    }
}
