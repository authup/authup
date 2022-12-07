/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    hasEnv,
    requireBoolOrStringFromEnv,
    requireFromEnv,
} from '@authup/server-common';
import { readOptionsFromEnv as readHttpOptionsFromEnv } from '@authup/server-http';
import { readOptionsFromEnv as readDBOptionsFromEnv } from '@authup/server-database';
import { BaseOptions, OptionsInput } from '../type';

export function readBaseOptionsFromEnv() : Partial<BaseOptions> {
    const options : Partial<BaseOptions> = {};

    if (hasEnv('NODE_ENV')) {
        options.env = requireFromEnv('NODE_ENV');
    }

    if (hasEnv('WRITABLE_DIRECTORY_PATH')) {
        options.writableDirectoryPath = requireFromEnv('WRITABLE_DIRECTORY_PATH');
    }

    if (hasEnv('REDIS')) {
        options.redis = requireBoolOrStringFromEnv('REDIS');
    }

    if (hasEnv('SMTP')) {
        options.smtp = requireBoolOrStringFromEnv('SMTP');
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
