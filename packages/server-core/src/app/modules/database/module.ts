/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Logger } from '@authup/server-kit';
import { AuthupError } from '@authup/errors';
import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';
import {
    checkDatabase, createDatabase, setDataSource, synchronizeDatabaseSchema, unsetDataSource, useDataSourceOptions,
} from 'typeorm-extension';
import {
    DatabaseSeeder,
    extendDataSourceOptions,
    isDatabaseTypeSupported,
    isDatabaseTypeSupportedForEnvironment,
    setDataSourceSync,
} from '../../../adapters/database';
import type { Config } from '../../../config';
import type { DependencyContainer } from '../../../core';
import type { ApplicationModule } from '../types';
import { DatabaseInjectionKey } from './constants';

export class DatabaseModule implements ApplicationModule {
    protected ctx : DependencyContainer;

    // ----------------------------------------------------

    constructor(container: DependencyContainer) {
        this.ctx = container;
    }

    // ----------------------------------------------------

    async start(): Promise<void> {
        const logger = this.ctx.resolve<Logger>('logger');

        const options = await this.createDataSourceOptions();

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

        await this.runSeeder(dataSource);

        this.ctx.register(DatabaseInjectionKey.DataSource, {
            useValue: dataSource,
        });
    }

    async stop(): Promise<void> {
        this.ctx.unregister(DatabaseInjectionKey.DataSource);

        unsetDataSource();
    }

    // ----------------------------------------------------

    protected async synchronize(dataSource: DataSource): Promise<void> {
        await synchronizeDatabaseSchema(dataSource);
    }

    // ----------------------------------------------------

    // todo: this should be a component/module
    protected async runSeeder(dataSource: DataSource): Promise<void> {
        const config = this.ctx.resolve<Config>('config');
        const seeder = new DatabaseSeeder(config);

        await seeder.run(dataSource);
    }

    // ----------------------------------------------------

    /**
     * Load data source options for connection.
     *
     * @protected
     */
    protected async createDataSourceOptions() : Promise<DataSourceOptions> {
        const config = this.ctx.resolve<Config>('config');

        const options = await useDataSourceOptions();

        if (!isDatabaseTypeSupported(options.type)) {
            throw new AuthupError(`Database type ${options.type} is not supported (only: mysql, better-sqlite3 and postgres).`);
        }

        if (!isDatabaseTypeSupportedForEnvironment(options.type, config.env)) {
            throw new AuthupError(`Database type ${options.type} is not supported for ${config.env} environment.`);
        }

        extendDataSourceOptions(options);

        return options;
    }
}
