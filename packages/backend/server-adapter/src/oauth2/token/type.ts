/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ClientOptions } from '@hapic/oauth2';
import { Client } from 'redis-extension';
import { Logger } from '../../socket';

export type TokenVerifyContext = {
    oauth2: string | ClientOptions,
    redis?: Client | boolean
    redisPrefix?: string,
    logger?: Logger,
};
