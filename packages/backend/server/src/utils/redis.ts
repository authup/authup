/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client, setConfig, useClient } from 'redis-extension';

export function useRedisClient(data?: string | boolean | Client) : Client | undefined {
    if (!data) {
        return undefined;
    }

    if (typeof data === 'string') {
        setConfig({
            connectionString: data,
        });

        data = true;
    }

    return typeof data === 'boolean' ?
        useClient() :
        data;
}
