/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Config } from './type';

import {
    hasEnv,
    requireBooleanFromEnv,
    requireFromEnv,
    requireIntegerFromEnv,
} from '../utils';

export function readEnvConfig() : Partial<Config> {
    const config : Partial<Config> = {};

    if (hasEnv('NODE_ENV')) {
        config.env = requireFromEnv('NODE_ENV');
    }

    if (hasEnv('PORT')) {
        config.port = parseInt(requireFromEnv('PORT'), 10);
    }

    if (hasEnv('SELF_URL')) {
        config.selfUrl = requireFromEnv('SELF_URL');
    }

    if (hasEnv('WEB_URL')) {
        config.webUrl = requireFromEnv('WEB_URL');
    }

    if (hasEnv('WRITABLE_DIRECTORY_PATH')) {
        config.writableDirectoryPath = requireFromEnv('WRITABLE_DIRECTORY_PATH');
    }

    if (hasEnv('ACCESS_TOKEN_MAX_AGE')) {
        config.tokenMaxAgeRefreshToken = requireIntegerFromEnv('ACCESS_TOKEN_MAX_AGE');
    }

    if (hasEnv('REFRESH_TOKEN_MAX_AGE')) {
        config.tokenMaxAgeAccessToken = requireIntegerFromEnv('REFRESH_TOKEN_MAX_AGE');
    }

    // -------------------------------------------------

    if (hasEnv('ADMIN_USERNAME')) {
        config.adminUsername = requireFromEnv('ADMIN_USERNAME');
    }

    if (hasEnv('ADMIN_PASSWORD')) {
        config.adminPassword = requireFromEnv('ADMIN_PASSWORD');
    }

    if (hasEnv('ROBOT_ENABLED')) {
        config.robotEnabled = requireBooleanFromEnv('ROBOT_ENABLED');
    }

    if (hasEnv('ROBOT_SECRET')) {
        config.adminPassword = requireFromEnv('ROBOT_SECRET');
    }

    if (hasEnv('PERMISSIONS')) {
        config.permissions = requireFromEnv('PERMISSIONS');
    }

    // -------------------------------------------------

    return config;
}
