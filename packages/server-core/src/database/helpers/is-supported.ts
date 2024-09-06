/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { DataSourceOptions, DatabaseType } from 'typeorm';
import type { BetterSqlite3ConnectionOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions';
import type { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

export function isDatabaseTypeSupported(type: DatabaseType) : boolean {
    return type === 'mysql' ||
        type === 'postgres' ||
        type === 'better-sqlite3';
}

export function isDatabaseOptionsSupported(
    options: DataSourceOptions,
) : options is MysqlConnectionOptions | PostgresConnectionOptions | BetterSqlite3ConnectionOptions {
    return isDatabaseTypeSupported(options.type);
}
