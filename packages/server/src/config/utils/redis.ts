/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Client, ClientOptions, buildConfig, setClient, setConfig,
} from 'redis-extension';
import { isObject } from 'smob';

export function isRedisClient(data: unknown) : data is Client {
    return isObject(data) &&
        typeof data.connect === 'function' &&
        typeof data.disconnect === 'function';
}

export function setupRedis(data: string | boolean | Client | ClientOptions): void {
    if (
        typeof data === 'boolean' ||
        !data
    ) {
        if (data) {
            setConfig(buildConfig({
                connectionString: 'redis://127.0.0.1',
            }));
        }

        return;
    }

    if (typeof data === 'string') {
        setConfig(buildConfig({
            connectionString: data,
        }));

        return;
    }

    if (!isRedisClient(data)) {
        setConfig(buildConfig({
            options: data,
        }));

        return;
    }

    setClient(data);
}
