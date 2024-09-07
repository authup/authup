/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { DataSourceOptions } from 'typeorm';
import {
    CodeTransformation, isCodeTransformation, transformFilePath,
} from 'typeorm-extension';
import type { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import { isRedisClientUsable, useRedisClient } from '@authup/server-kit';
import { isDatabaseTypeSupported } from '../helpers';
import { extendDataSourceOptionsWithEntities } from './entities';
import { extendDataSourceOptionsWithSubscribers } from './subscribers';
import { DatabaseQueryResultCache } from '../cache';

export function extendDataSourceOptions(options: DataSourceOptions) : DataSourceOptions {
    if (!isDatabaseTypeSupported(options.type)) {
        throw new Error('Only the database types mysql, better-sqlite3 and postgres are supported.');
    }

    let migrationPath = `src/database/migrations/${options.type}/*.{ts,js}`;
    if (!isCodeTransformation(CodeTransformation.JUST_IN_TIME)) {
        migrationPath = transformFilePath(migrationPath, './dist', './src');
    }

    Object.assign(options, {
        logging: ['error'],
        migrations: [migrationPath],
        migrationsTransactionMode: 'each',
    } satisfies Partial<DataSourceOptions>);

    if (isRedisClientUsable()) {
        const client = useRedisClient();

        Object.assign(options, {
            cache: {
                provider() {
                    return new DatabaseQueryResultCache(client);
                },
            },
        } as Partial<DataSourceOptions>);
    }

    extendDataSourceOptionsWithEntities(options);
    extendDataSourceOptionsWithSubscribers(options);

    if (options.type === 'mysql') {
        Object.assign(options, {
            connectorPackage: 'mysql2',
        } satisfies Partial<MysqlConnectionOptions>);
    }

    return options;
}
