/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { Config } from '../type';
import { ConfigDefault } from '../constants';
import { Subset } from '../../types';

export function extendConfig(
    config: Subset<Config>,
    directoryPath?: string,
): Config {
    directoryPath ??= process.cwd();

    config.env = config.env || ConfigDefault.ENV;

    config.port = config.port || ConfigDefault.PORT;

    config.selfUrl = config.selfUrl || `http://127.0.0.1:${config.port}/`;

    config.webUrl = config.selfUrl || `http://127.0.0.1:${config.port}/`;

    config.rootPath = config.rootPath || directoryPath;
    if (!path.isAbsolute(config.rootPath)) {
        config.rootPath = path.join(directoryPath, config.rootPath);
    }

    config.writableDirectoryPath = config.writableDirectoryPath || ConfigDefault.WRITABLE_DIRECTORY_PATH;
    if (!path.isAbsolute(config.writableDirectoryPath)) {
        config.writableDirectoryPath = config.writableDirectoryPath.replace(/\//g, path.sep);
        config.writableDirectoryPath = path.join(config.rootPath, config.writableDirectoryPath);
    }

    config.tokenMaxAgeAccessToken = config.tokenMaxAgeAccessToken || 3600;
    config.tokenMaxAgeRefreshToken = config.tokenMaxAgeRefreshToken || config.tokenMaxAgeAccessToken;

    config.redis = config.redis ?? false;

    // -------------------------------------------------

    config.registration = config.registration ?? false;
    config.emailVerification = config.emailVerification ?? false;

    // -------------------------------------------------

    config.adminUsername = config.adminUsername || ConfigDefault.ADMIN_USERNAME;
    config.adminPassword = config.adminPassword || ConfigDefault.ADMIN_PASSWORD;

    config.robotEnabled = config.robotEnabled ?? false;

    // -------------------------------------------------

    config.middlewareBodyParser = config.middlewareBodyParser ?? true;
    config.middlewareCookieParser = config.middlewareCookieParser ?? true;
    config.middlewareResponse = config.middlewareResponse ?? true;
    config.middlewareSwaggerEnabled = config.middlewareSwaggerEnabled ?? true;
    config.middlewareSwaggerDirectoryPath = config.middlewareSwaggerDirectoryPath || config.writableDirectoryPath;

    return config as Config;
}
