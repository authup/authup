/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EnvironmentName } from '@authup/kit';
import type { DataSource, DataSourceOptions } from 'typeorm';
import { readDataSourceOptionsFromEnv } from 'typeorm-extension';
import {
    type Config, ConfigInjectionKey, DatabaseModule,
} from '../../src';
import type { IDIContainer } from '../../src/core';

export class TestDatabaseModule extends DatabaseModule {
    protected async buildDataSourceOptions(container: IDIContainer): Promise<DataSourceOptions> {
        const config = container.resolve<Config>(ConfigInjectionKey);

        const options = readDataSourceOptionsFromEnv();
        if (
            options &&
            config.env === EnvironmentName.TEST
        ) {
            config.db = options;
        } else {
            config.db = {
                type: 'better-sqlite3',
                database: ':memory:',
            };
        }

        container.register(ConfigInjectionKey, {
            useValue: config,
        });

        return super.buildDataSourceOptions(container);
    }

    protected async synchronize(dataSource: DataSource): Promise<void> {
        await dataSource.synchronize();
    }
}
