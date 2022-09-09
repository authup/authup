/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Config, ConfigInput } from './type';
import { buildCoreOptionsFromConfig, setupRedis, setupSmtp } from './core';
import { buildDatabaseOptionsFromConfig } from './database';
import { buildMiddlewareOptionsFromConfig } from './http';

export function buildConfig(config: ConfigInput) : Config {
    const core = buildCoreOptionsFromConfig(config);
    const database = buildDatabaseOptionsFromConfig(config);
    const middleware = buildMiddlewareOptionsFromConfig(config);

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
