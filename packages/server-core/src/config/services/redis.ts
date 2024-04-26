/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createClient } from 'redis-extension';
import type { Client, ClientOptions } from 'redis-extension';
import { isObject } from 'smob';
import { setRedisClient, setRedisFactory } from '../../core';

export function isRedisClient(data: unknown) : data is Client {
    return isObject(data) &&
        typeof data.connect === 'function' &&
        typeof data.disconnect === 'function';
}

export function setupRedis(data: string | boolean | Client | ClientOptions): void {
    if (typeof data === 'boolean' || !data) {
        if (data) {
            setRedisFactory(() => createClient({
                connectionString: 'redis://127.0.0.1',
            }));
        }

        return;
    }

    if (typeof data === 'string') {
        setRedisFactory(() => createClient({
            connectionString: data,
        }));

        return;
    }

    if (!isRedisClient(data)) {
        setRedisFactory(() => createClient({
            options: data,
        }));

        return;
    }

    setRedisClient(data);
}
