/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasEnvDataSourceOptions, readDataSourceOptionsFromEnv } from 'typeorm-extension';
import type { BetterSqlite3DataSourceOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3DataSourceOptions.js';
import type { MysqlDataSourceOptions } from 'typeorm/driver/mysql/MysqlDataSourceOptions.js';
import type { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js';
import { CONFIG_SCHEMA } from '../registry.ts';
import { readSchemaFromEnv } from '../schema/index.ts';
import type { ConfigInput } from '../types.ts';

export function readConfigRawFromEnv() : ConfigInput {
    const options : ConfigInput = readSchemaFromEnv(CONFIG_SCHEMA);

    // The DB_* names come from typeorm-extension and stay outside the registry.
    if (hasEnvDataSourceOptions()) {
        // todo: type casting should be avoided
        options.db = readDataSourceOptionsFromEnv() as MysqlDataSourceOptions |
        PostgresDataSourceOptions |
        BetterSqlite3DataSourceOptions;
    }

    return options;
}
