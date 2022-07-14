/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client, setClient, setConfig } from 'redis-extension';

export function isRedisEnabled(data: string | boolean | Client): boolean {
    if (typeof data === 'boolean') {
        return data;
    }

    return typeof data !== 'undefined';
}

export function configureRedis(data: string | boolean | Client): void {
    if (
        typeof data === 'boolean' ||
        typeof data === 'undefined'
    ) {
        return;
    }

    if (typeof data === 'string') {
        setConfig({
            connectionString: data,
        });

        return;
    }

    setClient(data);
}
