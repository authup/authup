/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { Config } from './type';
import { ConfigDefault } from './constants';
import { requireFromEnv, requireIntegerFromEnv } from './utils';
import { extendDatabaseOptions } from '../database';
import { extendMiddlewareOptions } from '../http';
import { Subset } from '../types';

export function extendConfig(
    config: Subset<Config>,
    directoryPath?: string,
): Config {
    directoryPath ??= process.cwd();

    if (!config.env) {
        config.env = requireFromEnv('NODE_ENV', 'development');
    }

    if (!config.port) {
        config.port = parseInt(requireFromEnv('PORT', ConfigDefault.PORT), 10);
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

    const writableDirectoryPath = path.join(config.rootPath, config.writableDirectory);

    config.database = extendDatabaseOptions(config.database || {});

    if (!config.tokenMaxAge) {
        const refreshTokenMaxAge = requireIntegerFromEnv('REFRESH_TOKEN_MAX_AGE', 0);
        const accessTokenMaxAge = requireIntegerFromEnv('ACCESS_TOKEN_MAX_AGE', 0);

        if (accessTokenMaxAge || refreshTokenMaxAge) {
            if (!refreshTokenMaxAge && accessTokenMaxAge) {
                config.tokenMaxAge = accessTokenMaxAge;
            }

            if (accessTokenMaxAge && refreshTokenMaxAge) {
                config.tokenMaxAge = {
                    accessToken: accessTokenMaxAge,
                    refreshToken: refreshTokenMaxAge,
                };
            }
        }
    }

    config.middleware = extendMiddlewareOptions(
        config.middleware || {},
        writableDirectoryPath,
    );

    if (!config.keyPair) {
        config.keyPair = {};
    }

    if (!config.keyPair.directory) {
        config.keyPair.directory = writableDirectoryPath;
    }

    return config as Config;
}
