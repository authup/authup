/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSource, DataSourceOptions } from 'typeorm';
import { extendDataSourceOptions } from '../../src';
import { DatabaseModule } from '../../src/app';

export class TestDatabaseModule extends DatabaseModule {
    protected async createDataSourceOptions(): Promise<DataSourceOptions> {
        const options = extendDataSourceOptions({
            type: 'better-sqlite3',
            database: ':memory:',
        });

        Object.assign(options, {
            migrations: [],
        });

        return options;
    }

    protected async synchronize(dataSource: DataSource): Promise<void> {
        await dataSource.synchronize();
    }
}
