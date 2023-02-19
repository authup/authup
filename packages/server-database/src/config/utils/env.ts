/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    hasProcessEnv,
    readBoolFromProcessEnv,
    readFromProcessEnv,
} from '@authup/server-common';
import type { OptionsInput } from '../type';

export function readOptionsFromEnv() : OptionsInput {
    const options : OptionsInput = { };

    if (hasProcessEnv('NODE_ENV')) {
        options.env = readFromProcessEnv('NODE_ENV');
    }

    if (hasProcessEnv('WRITABLE_DIRECTORY_PATH')) {
        options.writableDirectoryPath = readFromProcessEnv('WRITABLE_DIRECTORY_PATH');
    }

    if (hasProcessEnv('ADMIN_USERNAME')) {
        options.adminUsername = readFromProcessEnv('ADMIN_USERNAME');
    }

    if (hasProcessEnv('ADMIN_PASSWORD')) {
        options.adminPassword = readFromProcessEnv('ADMIN_PASSWORD');
    }

    if (hasProcessEnv('ROBOT_ENABLED')) {
        options.robotEnabled = readBoolFromProcessEnv('ROBOT_ENABLED');
    }

    if (hasProcessEnv('ROBOT_SECRET')) {
        options.robotSecret = readFromProcessEnv('ROBOT_SECRET');
    }

    if (hasProcessEnv('PERMISSIONS')) {
        options.permissions = readFromProcessEnv('PERMISSIONS');
    }

    return options;
}
