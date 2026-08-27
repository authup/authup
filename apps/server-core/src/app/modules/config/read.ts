/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { normalizeConfig } from './normalize.ts';
import type { ConfigRawReadOptions, DatabaseConnectionOptions  } from '@authup/server-config';
import { readConfigRaw } from '@authup/server-config';
import type { Config } from './types.ts';
import { hasEnvDataSourceOptions, readDataSourceOptionsFromEnv } from 'typeorm-extension';
import { isObject } from 'smob';
import { CONFIG_SCHEMA } from './constants.ts';

/**
 * Read config from env (and optionally fs) and normalize it.
 *
 * @param options
 */
export async function readConfig(options: ConfigRawReadOptions<Config> = {}) : Promise<Config> {
    const raw = await readConfigRaw(
        CONFIG_SCHEMA,
        {
            fs: options.fs,
            env: options.env ?
                {
                    ...(isObject(options.env) ? options.env : {}),
                    fn: (options) => {
                        // The DB_* names come from typeorm-extension and stay outside the registry.
                        if (hasEnvDataSourceOptions()) {
                        // the configuration surface is deliberately untyped here: `db` is
                        // authup's own loose shape, and typeorm's driver union carries
                        // dialects (mariadb) this service does not support anyway. The
                        // supported set is asserted at connect time.
                            options.db = readDataSourceOptionsFromEnv() as DatabaseConnectionOptions;
                        }
                    },
                } : false,
            ...options,
        },
    );

    return normalizeConfig(raw);
}
