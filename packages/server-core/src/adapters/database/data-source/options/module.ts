/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSourceOptions } from 'typeorm';
import {
    CodeTransformation, isCodeTransformation, transformFilePath,
} from 'typeorm-extension';
import type { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions.js';
import { extendDataSourceOptionsWithEntities } from './entities';
import { extendDataSourceOptionsWithSubscribers } from './subscribers';
import { DatabaseQueryResultCache } from '../../cache';

export function extendDataSourceOptions(options: DataSourceOptions) : DataSourceOptions {
    if (options.type === 'mysql' || options.type === 'postgres') {
        let migrationPath = `src/adapters/database/migrations/${options.type}/*.{ts,js}`;
        if (!isCodeTransformation(CodeTransformation.JUST_IN_TIME)) {
            migrationPath = transformFilePath(migrationPath, './dist', './src');
        }

        Object.assign(options, {
            migrations: [migrationPath],
            migrationsTransactionMode: 'all',
        } satisfies Partial<DataSourceOptions>);
    }

    Object.assign(options, {
        logging: ['error'],
        // logger: new DatabaseLogger(logger),
        cache: {
            provider() {
                return new DatabaseQueryResultCache();
            },
        },
    } as Partial<DataSourceOptions>);

    extendDataSourceOptionsWithEntities(options);
    extendDataSourceOptionsWithSubscribers(options);

    if (options.type === 'mysql') {
        Object.assign(options, {
            connectorPackage: 'mysql2',
        } satisfies Partial<MysqlConnectionOptions>);
    }

    return options;
}
