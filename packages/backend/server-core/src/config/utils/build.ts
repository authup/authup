/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Config, ConfigInput } from '../type';
import { buildCoreOptions, setupRedis, setupSmtp } from '../core';
import { buildDatabaseOptions } from '../database';
import { buildHTTPMiddlewareOptions } from '../http/middleware';

export function buildConfig(config?: ConfigInput) : Config {
    config = config || {};

    const core = buildCoreOptions(config);
    const database = buildDatabaseOptions(config.database);

    config.middleware = config.middleware || {};
    config.middleware.swaggerDirectoryPath = config.middleware.swaggerDirectoryPath || core.writableDirectoryPath;
    const middleware = buildHTTPMiddlewareOptions(config.middleware);

    if (core.redis) {
        setupRedis(core.redis);
    }

    if (core.smtp) {
        setupSmtp(core.smtp);
    }

    return {
        ...core,
        database,
        middleware,
    };
}
