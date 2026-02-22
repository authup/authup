/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// eslint-disable-next-line max-classes-per-file
import { EnvironmentName } from '@authup/kit';
import type { Logger } from '@authup/server-kit';
import type { DataSource, DataSourceOptions } from 'typeorm';
import { readDataSourceOptionsFromEnv } from 'typeorm-extension';
import {
    type Config, ConfigInjectionKey, DatabaseModule, LoggerInjectionKey,
} from '../../src';
import type { IDIContainer } from '../../src/core';

export class TestDatabaseModuleBase extends DatabaseModule {
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
}

export class TestDatabaseModule extends TestDatabaseModuleBase {
    protected async setup(): Promise<void> {
        // dont do anything :)
    }

    protected async migrate(container: IDIContainer, dataSource: DataSource): Promise<void> {
        const logger = container.resolve<Logger>(LoggerInjectionKey);

        logger.debug('Synchronizing database...');
        await dataSource.synchronize();
        logger.debug('Synchronized database...');
    }
}
