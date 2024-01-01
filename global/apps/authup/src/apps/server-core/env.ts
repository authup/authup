/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Config } from '@authup/server-core-app';
import { getEnv, getEnvInt, hasEnv } from '@authup/core';

export function extendServerConfigWithEnv(config: Config) {
    if (hasEnv('PORT')) {
        config.port = getEnvInt('PORT');
    }

    if (hasEnv('API_PORT')) {
        config.port = getEnvInt('API_PORT');
    }

    if (hasEnv('WRITABLE_DIRECTORY_PATH')) {
        config.writableDirectoryPath = getEnv('WRITABLE_DIRECTORY_PATH');
    }
}
