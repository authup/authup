/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { Config } from '../type';
import { ConfigDefault } from '../constants';

function requireFromEnv(key : string, alt?: any) {
    if (!process.env[key] && typeof alt === 'undefined') {
        // eslint-disable-next-line no-console
        console.error(`[APP ERROR] Missing variable: ${key}`);

        return process.exit(1);
    }

    return process.env[key] ?? alt;
}

export function buildConfig(
    config: Partial<Config>,
    directoryPath?: string,
): Config {
    if (!config.env) {
        config.env = requireFromEnv('NODE_ENV', 'development');
    }

    if (!config.port) {
        config.port = parseInt(requireFromEnv('PORT', ConfigDefault.PORT), 10);
    }

    if (!config.adminUsername) {
        config.adminUsername = requireFromEnv('ADMIN_USERNAME', 'admin');
    }

    if (!config.adminPassword) {
        config.adminPassword = requireFromEnv('ADMIN_PASSWORD', 'start123');
    }

    if (!config.selfUrl) {
        config.selfUrl = requireFromEnv('SELF_URL', `http://127.0.0.1:${config.port}/`);
    }

    if (!config.webUrl) {
        config.webUrl = requireFromEnv('WEB_URL', 'http://127.0.0.1:3000/');
    }

    directoryPath ??= process.cwd();

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
        const maxAge : number = parseInt(requireFromEnv('TOKEN_MAX_AGE', '3600'), 10);
        config.tokenMaxAge = Number.isNaN(maxAge) ? 3600 : maxAge;
    }

    if (!config.swaggerDocumentation) {
        config.swaggerDocumentation = requireFromEnv('SWAGGER_DOCUMENTATION', 'true') !== 'false';
    }

    return config as Config;
}
