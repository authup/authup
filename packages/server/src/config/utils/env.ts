/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    hasProcessEnv,
    readBoolOrStringFromProcessEnv,
    readFromProcessEnv,
} from '@authup/server-common';
import { readOptionsFromEnv as readHttpOptionsFromEnv } from '@authup/server-http';
import { readOptionsFromEnv as readDBOptionsFromEnv } from '@authup/server-database';
import type { BaseOptions, OptionsInput } from '../type';

export function readBaseOptionsFromEnv() : Partial<BaseOptions> {
    const options : Partial<BaseOptions> = {};

    if (hasProcessEnv('NODE_ENV')) {
        options.env = readFromProcessEnv('NODE_ENV');
    }

    if (hasProcessEnv('WRITABLE_DIRECTORY_PATH')) {
        options.writableDirectoryPath = readFromProcessEnv('WRITABLE_DIRECTORY_PATH');
    }

    if (hasProcessEnv('REDIS')) {
        options.redis = readBoolOrStringFromProcessEnv('REDIS');
    }

    if (hasProcessEnv('SMTP')) {
        options.smtp = readBoolOrStringFromProcessEnv('SMTP');
    }

    if (hasProcessEnv('VAULT')) {
        options.vault = readBoolOrStringFromProcessEnv('VAULT');
    }

    return options;
}

export function readConfigFromEnv() : OptionsInput {
    return {
        base: readBaseOptionsFromEnv(),
        http: readHttpOptionsFromEnv(),
        database: readDBOptionsFromEnv(),
    };
}
