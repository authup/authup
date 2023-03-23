/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { setConfigOptions as setHTTPOptions } from '@authup/server-http';
import { setConfigOptions as setDatabaseOptions } from '@authup/server-database';
import { setupRedis, setupSmtp, setupVault } from '../clients';
import type { Options, OptionsInput } from '../type';
import { buildBaseOptions } from './build';

export function setOptions(config?: OptionsInput) : Options {
    config = config || {};

    const base = buildBaseOptions(config.base || {});

    const database = setDatabaseOptions({
        env: base.env,
        rootPath: base.rootPath,
        writableDirectoryPath: base.writableDirectoryPath,
        ...(config.database || {}),
    });

    const http = setHTTPOptions({
        env: base.env,
        rootPath: base.rootPath,
        writableDirectoryPath: base.writableDirectoryPath,
        ...(config.http || {}),
    });

    if (base.redis) {
        setupRedis(base.redis);
    }

    if (base.smtp) {
        setupSmtp(base.smtp);
    }

    if (base.vault) {
        setupVault(base.vault);
    }

    return {
        base,
        database,
        http,
    };
}
