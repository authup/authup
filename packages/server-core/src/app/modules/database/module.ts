/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICache, Logger } from '@authup/server-kit';
import {
    DomainEventPublisher, DomainEventRedisPublisher,
    DomainEventSocketPublisher, createRedisClient,
} from '@authup/server-kit';
import { AuthupError } from '@authup/errors';
import type { DataSourceOptions } from 'typeorm';
import { DataSource, InstanceChecker } from 'typeorm';
import {
    checkDatabase,
    createDatabase,
    setDataSource,
    synchronizeDatabaseSchema,
    unsetDataSource,
} from 'typeorm-extension';
import {
    DataSourceOptionsBuilder,
    DatabaseQueryResultCache,
    isDatabaseTypeSupported,
    isDatabaseTypeSupportedForEnvironment,
    setDataSourceSync,
} from '../../../adapters/database/index.ts';
import { setDomainEventPublisher } from '../../../adapters/database/event-publisher/index.ts';
import { CacheInjectionKey } from '../cache/index.ts';
import type { Config } from '../config/index.ts';
import type { Module } from '../types.ts';
import { DatabaseInjectionKey } from './constants.ts';
import { ConfigInjectionKey } from '../config/index.ts';
import type { IDIContainer } from '../../../core/index.ts';
import { LoggerInjectionKey } from '../logger/index.ts';

export class DatabaseModule implements Module {
    protected optionsBuilder : DataSourceOptionsBuilder;

    constructor() {
        this.optionsBuilder = new DataSourceOptionsBuilder();
    }

    async start(container: IDIContainer): Promise<void> {
        const logger = container.resolve<Logger>(LoggerInjectionKey);

        const options = await this.buildDataSourceOptions(container);

        const check = await checkDatabase({
            options,
        });

        if (!check.exists) {
            await createDatabase({ options, synchronize: false, ifNotExist: true });
        }

        logger.debug('Establishing database connection...');

        const dataSource = new DataSource(options);
        await dataSource.initialize();

        // todo: maybe remove this
        setDataSource(dataSource);
        setDataSourceSync(dataSource);

        logger.debug('Established database connection.');

        logger.debug('Applying database schema...');
        await this.synchronize(dataSource);
        logger.debug('Applied database schema.');

        container.register(DatabaseInjectionKey.DataSource, {
            useValue: dataSource,
        });

        this.registerRepositories(container, dataSource);
        this.registerEventPublisher(container);
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

    /**
     * Load data source options for connection.
     *
     * @protected
     */
    protected async buildDataSourceOptions(container: IDIContainer) : Promise<DataSourceOptions> {
        const config = container.resolve<Config>(ConfigInjectionKey);

        let options : DataSourceOptions | undefined;
        if (config.db) {
            options = this.optionsBuilder.buildWith(config.db);
        } else {
            options = this.optionsBuilder.buildWithEnv();
        }

        if (!options) {
            throw new AuthupError('Database options could not inferred.');
        }

        if (!isDatabaseTypeSupported(options.type)) {
            throw new AuthupError(`Database type ${options.type} is not supported (only: mysql, better-sqlite3 and postgres).`);
        }

        if (!isDatabaseTypeSupportedForEnvironment(options.type, config.env)) {
            throw new AuthupError(`Database type ${options.type} is not supported for ${config.env}.`);
        }

        const cacheResult = container.safeResolve<ICache>(CacheInjectionKey);
        if (cacheResult.success) {
            Object.assign(options, {
                cache: {
                    provider() {
                        return new DatabaseQueryResultCache(cacheResult.data);
                    },
                },
            } satisfies Partial<DataSourceOptions>);
        }

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

    // todo: move, wrong place
    protected registerEventPublisher(container: IDIContainer) {
        const config = container.resolve<Config>(ConfigInjectionKey);

        const publisher = new DomainEventPublisher();
        if (config.redis) {
            const client = createRedisClient(config.redis);

            publisher.mount(new DomainEventRedisPublisher(client));
            publisher.mount(new DomainEventSocketPublisher(client));
        }

        setDomainEventPublisher(publisher);
    }
}
