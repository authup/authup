/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DatabaseConnectionOptions } from '@authup/server-config';
import { readSchemaFromEnv } from '@authup/server-config-kit';
import { hasEnvDataSourceOptions, readDataSourceOptionsFromEnv } from 'typeorm-extension';
import { CONFIG_SCHEMA } from '../registry.ts';
import type { ConfigInput } from '../types.ts';

export function readConfigRawFromEnv() : ConfigInput {
    const options : ConfigInput = readSchemaFromEnv(CONFIG_SCHEMA);

    // The DB_* names come from typeorm-extension and stay outside the registry.
    if (hasEnvDataSourceOptions()) {
        // the configuration surface is deliberately untyped here: `db` is
        // authup's own loose shape, and typeorm's driver union carries
        // dialects (mariadb) this service does not support anyway. The
        // supported set is asserted at connect time.
        options.db = readDataSourceOptionsFromEnv() as DatabaseConnectionOptions;
    }

    return options;
}
