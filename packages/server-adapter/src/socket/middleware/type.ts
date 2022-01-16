/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { AxiosInstance } from 'axios';
import { Redis } from 'redis-extension';

export type SocketMiddlewareContext = {
    axios: AxiosInstance,
    redis?: Redis | boolean,
    redisPrefix?: string
};
