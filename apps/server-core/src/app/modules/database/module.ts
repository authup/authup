/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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
    unsetDataSourceSync,
} from '../../../adapters/database/index.ts';
import { setDomainEventPublisher } from '../../../adapters/database/event-publisher/index.ts';
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

        // todo: maybe remove this
        setDataSource(dataSource);
        setDataSourceSync(dataSource);

        if (this.options.migrate) {
            await this.options.migrate(container, dataSource);
        } else {
            await this.migrate(container, dataSource);
        }

        container.register(DatabaseInjectionKey.DataSource, { useValue: dataSource });

        this.registerRepositories(container, dataSource);
        this.registerEventPublisher(container);
    }

    async teardown(container: IContainer): Promise<void> {
        const dataSource = container.tryResolve(DatabaseInjectionKey.DataSource);
        if (dataSource.success) {
            await dataSource.data.destroy();

            container.unregister(DatabaseInjectionKey.DataSource);
        }

        unsetDataSource();
        unsetDataSourceSync();
    }

    // ----------------------------------------------------

    protected async setupDatabase(container: IContainer, options: DataSourceOptions): Promise<void> {
        const logger = container.resolve(LoggerInjectionKey);

        const check = await checkDatabase({
            options,
        });

        if (!check.exists) {
            logger.debug('Creating database...');
            await createDatabase({ options, synchronize: false, ifNotExist: true });
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
            container.register(entity, {
                useFactory: () => dataSource.getRepository(entity),
            });
        }
    }

    // todo: move, wrong place
    protected registerEventPublisher(container: IContainer) {
        const config = container.resolve(ConfigInjectionKey);

        const publisher = new DomainEventPublisher();
        if (config.redis) {
            const client = createRedisClient(config.redis);

            publisher.mount(new DomainEventRedisPublisher(client));
            publisher.mount(new DomainEventSocketPublisher(client));
        }

        setDomainEventPublisher(publisher);
    }
}
