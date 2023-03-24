/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import type { BaseOptions } from '../type';

export function extendCoreOptionsWithDefaults(config: Partial<BaseOptions>) : BaseOptions {
    config.env = config.env || 'production';

    config.rootPath = config.rootPath || process.cwd();
    if (!path.isAbsolute(config.rootPath)) {
        config.rootPath = path.join(process.cwd(), config.rootPath);
    }

    config.writableDirectoryPath = config.writableDirectoryPath || 'writable';
    if (!path.isAbsolute(config.writableDirectoryPath)) {
        config.writableDirectoryPath = config.writableDirectoryPath.replace(/\//g, path.sep);
        config.writableDirectoryPath = path.join(config.rootPath, config.writableDirectoryPath);
    }

    config.redis = config.redis ?? false;
    config.smtp = config.smtp ?? false;
    config.vault = config.vault ?? false;

    return config as BaseOptions;
}
