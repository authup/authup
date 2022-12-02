/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { setConfig as setHTTPConfig } from '@authelion/server-core';
import { setConfig as setDatabaseConfig } from '@authelion/server-database';
import { OptionsInput } from '../type';
import { buildBaseOptions } from './build';
import { setupRedis } from './redis';
import { setupSmtp } from './smtp';

export function applyConfig(config?: OptionsInput) : void {
    config = config || {};

    const base = buildBaseOptions(config.core);

    setDatabaseConfig({
        env: base.env,
        rootPath: base.rootPath,
        writableDirectoryPath: base.writableDirectoryPath,
        ...config.database,
    });

    setHTTPConfig({
        env: base.env,
        rootPath: base.rootPath,
        writableDirectoryPath: base.writableDirectoryPath,
        ...config.http,
    });

    if (base.redis) {
        setupRedis(base.redis);
    }

    if (base.smtp) {
        setupSmtp(base.smtp);
    }
}
