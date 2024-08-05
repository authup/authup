/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { DataSourceOptions } from 'typeorm';
import { adjustFilePath } from 'typeorm-extension';
import type { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import { isRedisClientUsable, useRedisClient } from '@authup/server-kit';
import { EnvironmentName, isDatabaseTypeSupported, useConfig } from '../../config';
import { setEntitiesForDataSourceOptions } from './entities';
import { setSubscribersForDataSourceOptions } from './subscribers';
import { DatabaseQueryResultCache } from '../cache';

export async function buildDataSourceOptions() : Promise<DataSourceOptions> {
    const config = useConfig();

    const dataSourceOptions = config.db;
    if (!isDatabaseTypeSupported(dataSourceOptions.type)) {
        throw new Error('At the moment only the database types mysql, better-sqlite3 and postgres are supported.');
    }

    return extendDataSourceOptions(dataSourceOptions);
}

export async function extendDataSourceOptions(options: DataSourceOptions) {
    const config = useConfig();

    const migrations : string[] = [];
    const migration = await adjustFilePath(
        `src/database/migrations/${options.type}/*.{ts,js}`,
    );

    migrations.push(migration);

    Object.assign(options, {
        logging: ['error'],
        migrations,
        migrationsTransactionMode: 'each',
    } satisfies Partial<DataSourceOptions>);

    if (isRedisClientUsable()) {
        const client = useRedisClient();

        Object.assign(options, {
            cache: {
                provider() {
                    return new DatabaseQueryResultCache(client);
                },
                ignoreErrors: config.env === EnvironmentName.PRODUCTION,
            },
        } as Partial<DataSourceOptions>);
    }

    options = setEntitiesForDataSourceOptions(options);
    options = setSubscribersForDataSourceOptions(options);

    if (options.type === 'mysql') {
        Object.assign(options, {
            connectorPackage: 'mysql2',
        } satisfies Partial<MysqlConnectionOptions>);
    }

    return options;
}
