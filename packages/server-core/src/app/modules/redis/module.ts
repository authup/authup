/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RedisClient, RedisClientOptions } from '@authup/server-kit';
import { createRedisClient, setRedisFactory } from '@authup/server-kit';
import { isObject } from 'smob';
import type { Module } from '../types';
import { RedisInjectionKey } from './constants';
import type { Config } from '../config';
import { ConfigInjectionKey } from '../config';
import type { IDIContainer } from '../../../core';

export class RedisModule implements Module {
    async start(container: IDIContainer): Promise<void> {
        const result = container.safeResolve<Config>(ConfigInjectionKey);
        if (!result.success || !result.data.redis) {
            return;
        }

        container.register(RedisInjectionKey, {
            useFactory: () => this.createClient(result.data.redis),
        });

        // todo: remove this
        setRedisFactory(() => this.createClient(result.data.redis));
    }

    // ----------------------------------------------------

    protected createClient(data: string | boolean | RedisClient | RedisClientOptions) : RedisClient {
        if (typeof data === 'boolean') {
            return createRedisClient({
                connectionString: 'redis://127.0.0.1',
            });
        }

        if (typeof data === 'string') {
            return createRedisClient({
                connectionString: data,
            });
        }

        if (!this.isClient(data)) {
            return createRedisClient({
                options: data,
            });
        }

        return data;
    }

    protected isClient(data: unknown) : data is RedisClient {
        return isObject(data) &&
            typeof data.connect === 'function' &&
            typeof data.disconnect === 'function';
    }
}
