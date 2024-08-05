/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RedisClient } from '@authup/server-kit';
import { RedisJsonAdapter, createRedisClient } from '@authup/server-kit';
import type { TokenVerificationData } from '../type';
import type { TokenVerifierCache } from './type';

export class TokenVerifierRedisCache implements TokenVerifierCache {
    protected instance : RedisJsonAdapter;

    constructor(input?: RedisClient | string) {
        let client: RedisClient;

        if (!input) {
            client = createRedisClient();
        } else if (typeof input === 'string') {
            client = createRedisClient({
                connectionString: input,
            });
        } else {
            client = input;
        }

        this.instance = new RedisJsonAdapter(client);
    }

    get(token: string): Promise<TokenVerificationData | undefined> {
        return this.instance.get(token);
    }

    set(token: string, data: TokenVerificationData, seconds?: number): Promise<void> {
        return this.instance.set(
            token,
            data,
            {
                seconds,
            },
        );
    }
}
