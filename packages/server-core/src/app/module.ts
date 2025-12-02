/*
 * Copyright (c) 2024-2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { isRedisClientUsable, isVaultClientUsable, useLogger } from '@authup/server-kit';
import process from 'node:process';
import { DataSource } from 'typeorm';
import {
    checkDatabase,
    createDatabase,
    dropDatabase,
    setDataSource,
    synchronizeDatabaseSchema,
    useDataSourceOptions,
} from 'typeorm-extension';
import { createDatabaseUniqueEntriesComponent, createOAuth2CleanerComponent } from '../components';
import type { Config } from '../config';
import {
    DatabaseSeeder, extendDataSourceOptions, isDatabaseTypeSupported, isDatabaseTypeSupportedForEnvironment, setDataSourceSync,
} from '../adapters/database';
import {
    Swagger,
    createHttpServer,
    createRouter,
} from '../adapters/http';
import type { Component } from '../components';
import { isRobotSynchronizationServiceUsable, useRobotSynchronizationService } from '../services';

export class Application {
    protected config : Config;

    protected components : Component[];

    constructor(config: Config) {
        this.config = config;

        this.components = [
            createOAuth2CleanerComponent(),
            createDatabaseUniqueEntriesComponent(),
        ];
    }

    async start() {
        const logger = useLogger();

        logger.info(`Environment: ${this.config.env}`);
        logger.info(`WritableDirectoryPath: ${this.config.writableDirectoryPath}`);
        logger.info(`Port: ${this.config.port}`);
        logger.info(`Host: ${this.config.host}`);
        logger.info(`Public-URL: ${this.config.publicUrl}`);
        logger.info(`Docs-URL: ${new URL('docs', this.config.publicUrl).href}`);

        logger.info(`Database: ${this.config.db.database} (${this.config.db.type})`);
        logger.info(`Redis: ${isRedisClientUsable() ? 'enabled' : 'disabled'}`);
        logger.info(`Vault: ${isVaultClientUsable() ? 'enabled' : 'disabled'}`);
        logger.info(`Robot: ${this.config.robotAdminEnabled ? 'enabled' : 'disabled'}`);

        /*
        HTTP Server & Express App
        */

        const swagger = new Swagger({
            baseURL: this.config.publicUrl,
        });

        const swaggerCanGenerate = await swagger.canGenerate();
        const swaggerExists = await swagger.exists();
        if (swaggerCanGenerate && !swaggerExists) {
            logger.info('Generating documentation...');

            await swagger.generate();

            logger.info('Generated documentation.');
        }

        const options = await useDataSourceOptions();
        if (!isDatabaseTypeSupported(options.type)) {
            logger
                .error(`Database type ${options.type} is not supported (only: mysql, better-sqlite3 and postgres).`);

            process.exit(1);
        }

        if (!isDatabaseTypeSupportedForEnvironment(options.type, this.config.env)) {
            logger
                .error(`Database type ${options.type} is not supported for ${this.config.env} environment.`);

            process.exit(1);
        }

        extendDataSourceOptions(options);

        const check = await checkDatabase({
            options,
        });

        if (!check.exists) {
            await createDatabase({ options, synchronize: false, ifNotExist: true });
        }

        logger.info('Establishing database connection...');

        const dataSource = new DataSource(options);
        await dataSource.initialize();

        setDataSource(dataSource);
        setDataSourceSync(dataSource);

        logger.info('Established database connection.');

        if (!check.schema) {
            logger.info('Applying database schema...');

            await synchronizeDatabaseSchema(dataSource);

            logger.info('Applied database schema.');
        }

        const seeder = new DatabaseSeeder(this.config);
        const seederData = await seeder.run(dataSource);

        if (seederData.robot) {
            if (isRobotSynchronizationServiceUsable()) {
                try {
                    const robotSynchronizationService = useRobotSynchronizationService();
                    await robotSynchronizationService.save(seederData.robot);
                } catch (e) {
                    useLogger()
                        .warn(`The ${this.config.robotAdminName} robot credentials could not be saved to vault.`);
                }
            }
        }

        this.components.forEach((component) => component.start());

        logger.info('Starting http server...');

        const router = await createRouter();
        const httpServer = createHttpServer({ router });
        httpServer.listen(this.config.port, this.config.host, () => {
            logger.info('Started http server.');
        });
    }

    async reset() {
        const logger = useLogger();

        logger.info('Executing database reset.');

        const options = await useDataSourceOptions();
        extendDataSourceOptions(options);

        await dropDatabase({ options });

        logger.info('Executed database reset.');
    }
}
