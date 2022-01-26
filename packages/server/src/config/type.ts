/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from 'redis-extension';

export type Config = {
    env: string,
    port: number,

    adminUsername: string,
    adminPassword: string,

    robotSecret?: string,

    rootPath: string,
    writableDirectory: string

    selfUrl: string,
    webUrl: string,

    swaggerDocumentation: boolean,

    tokenMaxAge: number,

    redis?: string | boolean | Client
};
