/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DomainEventPublisher,
    DomainEventRedisHandler,
    DomainEventSocketHandler,
    createRedisClient,
} from '@authup/server-kit';
import type { RedisClient } from '@authup/server-kit';
import { AuthupError } from '@authup/errors';
import type { DataSourceOptions } from 'typeorm';
import { DataSource, InstanceChecker } from 'typeorm';
import {
    checkDatabase,
    createDatabase,
    synchronizeDatabaseSchema,
} from 'typeorm-extension';
import {
    DataSourceOptionsBuilder,
    DatabaseQueryResultCache,
    EntitySubscriber,
    isDatabaseTypeSupported,
    isDatabaseTypeSupportedForEnvironment,
} from '../../../adapters/database/index.ts';
import { CacheInjectionKey } from '../cache/index.ts';
import type { IModule } from 'orkos';
import { ModuleName } from '../constants.ts';
import { DatabaseInjectionKey } from './constants.ts';
import { ConfigInjectionKey } from '../config/index.ts';
import type { IContainer } from 'eldin';
import { LoggerInjectionKey } from '../logger/index.ts';

export type DatabaseModuleOptions = {
    prepareBuild?: (container: IContainer) => Promise<void>;
    setup?: (container: IContainer, options: DataSourceOptions) => Promise<void>;
    migrate?: (container: IContainer, dataSource: DataSource) => Promise<void>;
};

export class DatabaseModule implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    protected optionsBuilder : DataSourceOptionsBuilder;

    protected options: DatabaseModuleOptions;

    protected eventRedisClient? : RedisClient;

    constructor(options: DatabaseModuleOptions = {}) {
        this.name = ModuleName.DATABASE;
        this.dependencies = [ModuleName.CONFIG, ModuleName.LOGGER];

        this.optionsBuilder = new DataSourceOptionsBuilder();
        this.options = options;
    }

    async setup(container: IContainer): Promise<void> {
        const logger = container.resolve(LoggerInjectionKey);

        if (this.options.prepareBuild) {
            await this.options.prepareBuild(container);
        }

        const dataSourceOptions = await this.buildDataSourceOptions(container);

        if (this.options.setup) {
            await this.options.setup(container, dataSourceOptions);
        } else {
            await this.setupDatabase(container, dataSourceOptions);
        }

        const dataSource = new DataSource(dataSourceOptions);

        logger.debug('Establishing database connection...');
        await dataSource.initialize();
        logger.debug('Established database connection.');

        if (this.options.migrate) {
            await this.options.migrate(container, dataSource);
        } else {
            await this.migrate(container, dataSource);
        }

        container.register(DatabaseInjectionKey.DataSource, { useValue: dataSource });

        this.registerRepositories(container, dataSource);
        this.registerEventPublisher(container, dataSource);
    }

    async teardown(container: IContainer): Promise<void> {
        const dataSource = container.tryResolve(DatabaseInjectionKey.DataSource);
        if (dataSource.success) {
            await dataSource.data.destroy();

            container.unregister(DatabaseInjectionKey.DataSource);
        }

        container.unregister(DatabaseInjectionKey.DomainEventPublisher);

        if (this.eventRedisClient) {
            this.eventRedisClient.disconnect();
            this.eventRedisClient = undefined;
        }
    }

    // ----------------------------------------------------

    protected async setupDatabase(container: IContainer, options: DataSourceOptions): Promise<void> {
        const logger = container.resolve(LoggerInjectionKey);

        const check = await checkDatabase({ options });

        if (!check.exists) {
            logger.debug('Creating database...');
            await createDatabase({
                options,
                synchronize: false,
                ifNotExist: true, 
            });
            logger.debug('Created database');
        }
    }

    protected async migrate(container: IContainer, dataSource: DataSource): Promise<void> {
        const logger = container.resolve(LoggerInjectionKey);

        logger.debug('Migrating database...');
        await synchronizeDatabaseSchema(dataSource);
        logger.debug('Migrated database');
    }

    // ----------------------------------------------------

    /**
     * Load data source options for connection.
     *
     * @protected
     */
    protected async buildDataSourceOptions(container: IContainer) : Promise<DataSourceOptions> {
        const config = container.resolve(ConfigInjectionKey);

        let options : DataSourceOptions | undefined;
        if (config.db) {
            options = this.optionsBuilder.buildWith(config.db);
        } else {
            options = this.optionsBuilder.buildWithEnv();
        }

        if (!isDatabaseTypeSupported(options.type)) {
            throw new AuthupError(`Database type ${options.type} is not supported (only: mysql, better-sqlite3 and postgres).`);
        }

        if (!isDatabaseTypeSupportedForEnvironment(options.type, config.env)) {
            throw new AuthupError(`Database type ${options.type} is not supported for ${config.env}.`);
        }

        const cacheResult = container.tryResolve(CacheInjectionKey);
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

    protected registerRepositories(container: IContainer, dataSource: DataSource) : void {
        const entities = dataSource.options.entities || [];
        if (!Array.isArray(entities)) {
            return;
        }

        for (const entity of entities) {
            if (InstanceChecker.isEntitySchema(entity)) {
                continue;
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            container.register(entity, { useFactory: () => dataSource.getRepository(entity) });
        }
    }

    protected registerEventPublisher(container: IContainer, dataSource: DataSource) {
        const config = container.resolve(ConfigInjectionKey);
        const logger = container.resolve(LoggerInjectionKey);

        const publisher = new DomainEventPublisher({ logger });
        if (config.redis) {
            const client = createRedisClient(config.redis);
            if (client !== config.redis) {
                this.eventRedisClient = client;
            }

            publisher.register(new DomainEventRedisHandler(client));
            publisher.register(new DomainEventSocketHandler(client));
        }

        container.register(DatabaseInjectionKey.DomainEventPublisher, { useValue: publisher });

        for (let i = 0; i < dataSource.subscribers.length; i++) {
            const subscriber = dataSource.subscribers[i];
            if (subscriber instanceof EntitySubscriber) {
                subscriber.setPublisher(publisher);
            }
        }
    }
}
