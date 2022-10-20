/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { CoreOptions } from '../type';

export function extendCoreOptionsWithDefaults(config: Partial<CoreOptions>) : CoreOptions {
    config.env = config.env || 'production';

    config.port = config.port || 3010;

    config.selfUrl = config.selfUrl || `http://127.0.0.1:${config.port}/`;

    config.webUrl = config.webUrl || `http://127.0.0.1:${config.port}/`;

    config.rootPath = config.rootPath || process.cwd();
    if (!path.isAbsolute(config.rootPath)) {
        config.rootPath = path.join(process.cwd(), config.rootPath);
    }

    config.writableDirectoryPath = config.writableDirectoryPath || 'writable';
    if (!path.isAbsolute(config.writableDirectoryPath)) {
        config.writableDirectoryPath = config.writableDirectoryPath.replace(/\//g, path.sep);
        config.writableDirectoryPath = path.join(config.rootPath, config.writableDirectoryPath);
    }

    config.tokenMaxAgeAccessToken = config.tokenMaxAgeAccessToken || 3600;
    config.tokenMaxAgeRefreshToken = config.tokenMaxAgeRefreshToken || config.tokenMaxAgeAccessToken;

    config.redis = config.redis ?? false;
    config.smtp = config.smtp ?? false;

    config.registration = config.registration ?? false;
    config.emailVerification = config.emailVerification ?? false;
    config.forgotPassword = config.forgotPassword ?? false;

    return config as CoreOptions;
}
