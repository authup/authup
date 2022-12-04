/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Client, ClientOptions, setClient, setConfig, useClient,
} from 'redis-extension';
import { hasOwnProperty } from '@authup/common';

export function isRedisClient(data: unknown) : data is Client {
    return typeof data === 'object' &&
        data !== null &&
        hasOwnProperty(data, 'connect') &&
        hasOwnProperty(data, 'disconnect');
}

export function setupRedis(data: string | boolean | Client | ClientOptions): void {
    if (
        typeof data === 'boolean' ||
        typeof data === 'undefined'
    ) {
        if (data) {
            useClient();
        }

        return;
    }

    if (typeof data === 'string') {
        setConfig({
            connectionString: data,
        });

        return;
    }

    if (!isRedisClient(data)) {
        setConfig({
            options: data,
        });

        return;
    }

    setClient(data);
}
