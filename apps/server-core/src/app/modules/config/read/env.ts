/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { read } from 'envix';
import { hasEnvDataSourceOptions, readDataSourceOptionsFromEnv } from 'typeorm-extension';
import type { BetterSqlite3DataSourceOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3DataSourceOptions.js';
import type { MysqlDataSourceOptions } from 'typeorm/driver/mysql/MysqlDataSourceOptions.js';
import type { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js';
import { CONFIG_SCHEMA } from '../schema.ts';
import type { Config, ConfigInput } from '../types.ts';

export function readConfigRawFromEnv() : ConfigInput {
    const options : ConfigInput = {};

    const keys = Object.keys(CONFIG_SCHEMA) as (keyof Config)[];
    for (const key of keys) {
        const entry = CONFIG_SCHEMA[key];
        if (!entry.env) {
            continue;
        }

        const raw = read(entry.env);
        if (typeof raw !== 'string') {
            continue;
        }

        const value = entry.readEnv(raw, entry.env);
        if (typeof value !== 'undefined') {
            (options as Record<string, unknown>)[key] = value;
        }
    }

    // The DB_* names come from typeorm-extension and stay outside the registry.
    if (hasEnvDataSourceOptions()) {
        // todo: type casting should be avoided
        options.db = readDataSourceOptionsFromEnv() as MysqlDataSourceOptions |
        PostgresDataSourceOptions |
        BetterSqlite3DataSourceOptions;
    }

    return options;
}
