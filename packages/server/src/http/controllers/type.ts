/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from 'redis-extension';
import { TokenMaxAgeType } from '@typescript-auth/domains';

export type ControllerOptions = {
    tokenMaxAge?: TokenMaxAgeType,

    selfUrl: string,
    selfAuthorizeRedirectUrl?: string,

    writableDirectoryPath: string,
    redis?: Client | string | boolean
};
