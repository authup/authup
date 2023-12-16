/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Config } from '@authup/server-core-app';
import { hasProcessEnv, readFromProcessEnv, readIntFromProcessEnv } from '@authup/server-core';

export function extendServerConfigWithEnv(config: Config) {
    if (hasProcessEnv('PORT')) {
        config.set('port', readIntFromProcessEnv('PORT'));
    }

    if (hasProcessEnv('API_PORT')) {
        config.set('port', readIntFromProcessEnv('API_PORT'));
    }

    if (hasProcessEnv('WRITABLE_DIRECTORY_PATH')) {
        config.set('writableDirectoryPath', readFromProcessEnv('WRITABLE_DIRECTORY_PATH'));
    }
}
