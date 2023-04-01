import type { DataSourceOptions, DatabaseType } from 'typeorm';
import type { BetterSqlite3ConnectionOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions';
import type { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

type DatabaseTypes = 'mysql' | 'postgres' | 'better-sqlite3';

export function isDatabaseTypeSupported(type: DatabaseType) : type is DatabaseTypes {
    return type === 'mysql' || type === 'postgres' || type === 'better-sqlite3';
}

export type DataSourceConfiguration = Omit<MysqlConnectionOptions, 'replication' | 'ssl'> |
Omit<PostgresConnectionOptions, 'replication' | 'ssl' | 'nativeDriver'> |
Omit<BetterSqlite3ConnectionOptions, 'verbose'>;

export function isDataSourceConfigurationSupported(input: DataSourceOptions) : input is DataSourceConfiguration {
    return isDatabaseTypeSupported(input.type);
}
