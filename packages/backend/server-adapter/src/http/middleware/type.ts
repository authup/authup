/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ClientDriverInstance } from '@trapi/client';
import { Client } from 'redis-extension';
import { Logger } from '../../socket';

export type HTTPMiddlewareContext = {
    http: ClientDriverInstance,
    redis?: Client | boolean
    redisPrefix?: string,
    logger?: Logger,

    cookieHandler?: (cookies: any) => string | undefined
};
