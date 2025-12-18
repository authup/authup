/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EnvironmentName } from '@authup/kit';
import type { Logger } from '@authup/server-kit';
import { AuthupError } from '@authup/errors';
import type { DataSourceOptions } from 'typeorm';
import { DataSource, InstanceChecker } from 'typeorm';
import {
    checkDatabase,
    createDatabase,
    setDataSource,
    synchronizeDatabaseSchema,
    unsetDataSource,
    useDataSourceOptions,
} from 'typeorm-extension';
import type { DatabaseSeederOptions } from '../../../adapters/database';
import {
    DatabaseSeeder,
    extendDataSourceOptions,
    isDatabaseTypeSupported,
    isDatabaseTypeSupportedForEnvironment,
    setDataSourceSync,
} from '../../../adapters/database';
import type { Config } from '../config';
import type { Module } from '../types';
import { DatabaseInjectionKey } from './constants';
import { ConfigInjectionKey } from '../config';
import type { IDIContainer } from '../../../core';
import { LoggerInjectionKey } from '../logger';

export class DatabaseModule implements Module {
    async start(container: IDIContainer): Promise<void> {
        const logger = container.resolve<Logger>(LoggerInjectionKey);
        const config = container.resolve<Config>(ConfigInjectionKey);

        const options = await this.createDataSourceOptions(config.db, config.env);

        const check = await checkDatabase({
            options,
        });

        if (!check.exists) {
            await createDatabase({ options, synchronize: false, ifNotExist: true });
        }

        logger.info('Establishing database connection...');

        const dataSource = new DataSource(options);
        await dataSource.initialize();

        // todo: maybe remove this
        setDataSource(dataSource);
        setDataSourceSync(dataSource);

        logger.info('Established database connection.');

        if (!check.schema) {
            logger.info('Applying database schema...');

            await this.synchronize(dataSource);

            logger.info('Applied database schema.');
        }

        await this.runSeeder(dataSource, config);

        container.register(DatabaseInjectionKey.DataSource, {
            useValue: dataSource,
        });

        this.registerRepositories(container, dataSource);
    }

    async stop(container: IDIContainer): Promise<void> {
        container.unregister(DatabaseInjectionKey.DataSource);

        unsetDataSource();
    }

    // ----------------------------------------------------

    protected async synchronize(dataSource: DataSource): Promise<void> {
        await synchronizeDatabaseSchema(dataSource);
    }

    // ----------------------------------------------------

    // todo: this should be a component/module
    protected async runSeeder(dataSource: DataSource, options: Partial<DatabaseSeederOptions>): Promise<void> {
        const seeder = new DatabaseSeeder(options);

        await seeder.run(dataSource);
    }

    // ----------------------------------------------------

    /**
     * Load data source options for connection.
     *
     * @protected
     */
    protected async createDataSourceOptions(input?: DataSourceOptions, env?: string) : Promise<DataSourceOptions> {
        let options : DataSourceOptions;
        if (input) {
            options = input;
        } else {
            options = await useDataSourceOptions();
        }

        if (!isDatabaseTypeSupported(options.type)) {
            throw new AuthupError(`Database type ${options.type} is not supported (only: mysql, better-sqlite3 and postgres).`);
        }

        if (!isDatabaseTypeSupportedForEnvironment(options.type, env || EnvironmentName.PRODUCTION)) {
            throw new AuthupError(`Database type ${options.type} is not supported for ${env || EnvironmentName.PRODUCTION}.`);
        }

        extendDataSourceOptions(options);

        return options;
    }

    protected registerRepositories(container: IDIContainer, dataSource: DataSource) : void {
        const entities = dataSource.options.entities || [];
        if (!Array.isArray(entities)) {
            return;
        }

        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            if (InstanceChecker.isEntitySchema(entity)) {
                continue;
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            container.register(entity, {
                useFactory: () => dataSource.getRepository(entity),
            });
        }
    }
}
