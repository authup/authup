/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AxiosInstance } from 'axios';
import { Client } from 'redis-extension';

export type HTTPMiddlewareContext = {
    axios: AxiosInstance,
    redis?: Client | boolean
    redisPrefix?: string,

    cookieHandler?: (cookies: any) => string | undefined
};
