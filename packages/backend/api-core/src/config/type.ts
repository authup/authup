/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenMaxAgeType } from '@authelion/common';

export type Config = {
    env: string,
    port: number,

    admin: {
        username: string,
        password: string
    },

    robot: {
        enabled: boolean,
        secret?: string
    },

    permissions: string[],

    rootPath: string,
    writableDirectory: string

    selfUrl: string,
    webUrl: string,

    tokenMaxAge: TokenMaxAgeType,

    redis: {
        enabled: boolean,
        alias?: string,
        connectionString?: string
    },

    middleware: {
        bodyParser?: boolean,
        cookieParser?: boolean,
        response?: boolean,
        swagger?: boolean
    }
};
