/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { Config } from '../type';
import { ConfigDefault } from '../constants';
import { requireBooleanFromEnv, requireFromEnv } from './utils';

export function buildConfig(
    config: Partial<Config>,
    directoryPath?: string,
): Config {
    directoryPath ??= process.cwd();

    if (!config.env) {
        config.env = requireFromEnv('NODE_ENV', 'development');
    }

    if (!config.port) {
        config.port = parseInt(requireFromEnv('PORT', ConfigDefault.PORT), 10);
    }

    if (!config.admin) {
        config.admin = {} as Config['admin'];
    }

    if (!config.admin.username) {
        config.admin.username = requireFromEnv('ADMIN_USERNAME', 'admin');
    }

    if (!config.admin.password) {
        config.admin.password = requireFromEnv('ADMIN_PASSWORD', 'start123');
    }

    if (!config.robot) {
        config.robot = {} as Config['robot'];
    }

    if (typeof config.robot.enabled === 'undefined') {
        config.robot.enabled = requireBooleanFromEnv('ROBOT_ENABLED', true);
    }

    if (!config.robot.secret) {
        config.robot.secret = requireFromEnv('ROBOT_SECRET', null) || undefined;
    }

    if (!config.permissions) {
        const permissions = requireFromEnv('PERMISSIONS', null);
        if (permissions) {
            config.permissions = permissions.split(',').filter();
        } else {
            config.permissions = [];
        }
    }

    if (!config.selfUrl) {
        config.selfUrl = requireFromEnv('SELF_URL', `http://127.0.0.1:${config.port}/`);
    }

    if (!config.webUrl) {
        config.webUrl = requireFromEnv('WEB_URL', `http://127.0.0.1:${config.port}/`);
    }

    if (config.rootPath) {
        if (!path.isAbsolute(config.rootPath)) {
            config.rootPath = path.join(directoryPath, config.rootPath);
        }
    } else {
        config.rootPath = directoryPath;
    }

    if (!config.writableDirectory) {
        config.writableDirectory = requireFromEnv('WRITABLE_DIRECTORY', ConfigDefault.WRITABLE_DIRECTORY);
    }

    config.writableDirectory = config.writableDirectory.replace(/\//g, path.sep);

    if (!config.tokenMaxAge) {
        const refreshTokenMaxAge = parseInt(requireFromEnv('REFRESH_TOKEN_MAX_AGE', 0), 10);
        const accessTokenMaxAge = parseInt(requireFromEnv('ACCESS_TOKEN_MAX_AGE', 0), 10);

        if (accessTokenMaxAge || refreshTokenMaxAge) {
            if (
                !refreshTokenMaxAge &&
                accessTokenMaxAge
            ) {
                config.tokenMaxAge = accessTokenMaxAge;
            }

            if (
                accessTokenMaxAge &&
                refreshTokenMaxAge
            ) {
                config.tokenMaxAge = {
                    accessToken: accessTokenMaxAge,
                    refreshToken: refreshTokenMaxAge,
                };
            }
        }
    }

    if (!config.middleware) {
        config.middleware = {
            bodyParser: true,
            cookieParser: true,
            response: true,
            swagger: true,
        };
    }

    if (!config.redis) {
        config.redis = {} as Config['redis'];
    }

    if (typeof config.redis.enabled === 'undefined') {
        config.redis.enabled = requireBooleanFromEnv('REDIS_ENABLED', false);
    }

    if (!config.redis.connectionString) {
        config.redis.connectionString = requireFromEnv('REDIS_CONNECTION_STRING', null) || undefined;
    }

    if (!config.redis.alias) {
        config.redis.alias = requireFromEnv('REDIS_ALIAS', null) || undefined;
    }

    return config as Config;
}
