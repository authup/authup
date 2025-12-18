/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICache } from '@authup/server-kit';
import type { DataSource, DataSourceOptions } from 'typeorm';
import {
    CacheInjectionKey, DatabaseModule, DatabaseQueryResultCache, extendDataSourceOptions,
} from '../../src';
import type { IDIContainer } from '../../src/core';

export class TestDatabaseModule extends DatabaseModule {
    protected async createDataSourceOptions(container: IDIContainer): Promise<DataSourceOptions> {
        const cache = container.resolve<ICache>(CacheInjectionKey);

        const options = extendDataSourceOptions({
            type: 'better-sqlite3',
            database: ':memory:',
        });

        Object.assign(options, {
            migrations: [],
            cache: {
                provider() {
                    return new DatabaseQueryResultCache(cache);
                },
            },
        });

        return options;
    }

    protected async synchronize(dataSource: DataSource): Promise<void> {
        await dataSource.synchronize();
    }
}
