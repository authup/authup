/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from 'redis-extension';
import { Cache, createClient } from 'redis-extension';
import type { TokenVerificationData } from '../type';
import type { TokenVerifierCache } from './type';

export class TokenVerifierRedisCache implements TokenVerifierCache {
    protected instance : Cache<string>;

    constructor(input?: Client | string) {
        let client: Client;

        if (!client) {
            client = createClient();
        } else if (typeof input === 'string') {
            client = createClient({
                connectionString: input,
            });
        } else {
            client = input;
        }

        this.instance = new Cache<string>({
            redis: client,
        }, {
            prefix: 'token',
        });
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
