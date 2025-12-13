/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';
import {
    checkDatabase, createDatabase, setDataSource, synchronizeDatabaseSchema, unsetDataSource, useDataSourceOptions,
} from 'typeorm-extension';
import {
    extendDataSourceOptions,
    isDatabaseTypeSupported,
    isDatabaseTypeSupportedForEnvironment,
    setDataSourceSync,
} from '../../../adapters/database';
import type { ModuleContextContainer } from '../context';
import type { ApplicationModule } from '../types';

export class DatabaseModule implements ApplicationModule {
    protected ctx : ModuleContextContainer;

    // ----------------------------------------------------

    constructor(container: ModuleContextContainer) {
        this.ctx = container;
    }

    // ----------------------------------------------------

    async start(): Promise<void> {
        const logger = this.ctx.require('logger');

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

            this.synchronize(dataSource);

            logger.info('Applied database schema.');
        }

        this.ctx.register('dataSource', dataSource);
    }

    async stop(): Promise<void> {
        this.ctx.unregister('dataSource');

        unsetDataSource();
    }

    // ----------------------------------------------------

    protected async synchronize(dataSource: DataSource): Promise<void> {
        await synchronizeDatabaseSchema(dataSource);
    }

    // ----------------------------------------------------

    /**
     * Load data source options for connection.
     *
     * @protected
     */
    protected async createDataSourceOptions() : Promise<DataSourceOptions> {
        const config = this.ctx.require('config');

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
