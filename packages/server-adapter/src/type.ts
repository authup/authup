/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ClientOptions } from '@hapic/oauth2';
import { Client } from 'redis-extension';

export type LeveledLogMethod = {
    (message: string, ...meta: any[]): Logger;
    (message: any): Logger;
    [key: string]: any
};

export type Logger = {
    error: LeveledLogMethod,
    warn: LeveledLogMethod,
    info: LeveledLogMethod,
    debug: LeveledLogMethod,
    [key: string]: any
};

export type VerifyContext = {
    oauth2: string | ClientOptions,
    redis?: Client | boolean
    redisPrefix?: string,
    logger?: Logger,
};
