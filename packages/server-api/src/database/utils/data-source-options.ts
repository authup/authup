/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { DataSourceOptions } from 'typeorm';
import { hasClient, hasConfig } from 'redis-extension';
import { adjustFilePath } from 'typeorm-extension';
import { isDatabaseTypeSupported, useConfig } from '../../config';
import { setEntitiesForDataSourceOptions } from './entities';
import { setSubscribersForDataSourceOptions } from './subscribers';
import { DatabaseQueryResultCache } from '../cache';

export async function buildDataSourceOptions() : Promise<DataSourceOptions> {
    const config = useConfig();

    const dataSourceOptions = config.get('db');
    if (!isDatabaseTypeSupported(dataSourceOptions.type)) {
        throw new Error('At the moment only the database types mysql, better-sqlite3 and postgres are supported.');
    }

    return extendDataSourceOptions(dataSourceOptions);
}

export async function extendDataSourceOptions(options: DataSourceOptions) {
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

    if (hasClient() || hasConfig()) {
        Object.assign(options, {
            cache: {
                provider() {
                    return new DatabaseQueryResultCache();
                },
                ignoreErrors: true,
            },
        } as Partial<DataSourceOptions>);
    }

    options = setEntitiesForDataSourceOptions(options);
    options = setSubscribersForDataSourceOptions(options);

    return options;
}
