/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from 'redis-extension';
import { TokenMaxAgeType } from '@authelion/common';

export type Config = {
    env: string,
    port: number,

    adminUsername: string,
    adminPassword: string,

    robotSecret?: string,

    permissions?: string[],

    rootPath: string,
    writableDirectory: string

    selfUrl: string,
    webUrl: string,

    swaggerDocumentation: boolean,

    tokenMaxAge: TokenMaxAgeType,

    redis?: string | boolean | Client
};
