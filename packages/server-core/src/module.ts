/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isRedisClientUsable, isVaultClientUsable, useLogger } from '@authup/server-kit';
import { DataSource } from 'typeorm';
import {
    checkDatabase,
    createDatabase,
    dropDatabase,
    setDataSource,
    synchronizeDatabaseSchema,
    useDataSourceOptions,
} from 'typeorm-extension';
import { createOAuth2Cleaner } from './components';
import type { Config } from './config';
import { DatabaseSeeder, extendDataSourceOptions, setDataSourceSync } from './database';
import {
    createHttpServer,
    createRouter,
} from './http';
import type { Component } from './components';
import { SwaggerService, isRobotSynchronizationServiceUsable, useRobotSynchronizationService } from './services';

export class Application {
    protected config : Config;

    protected components : Component[];

    constructor(config: Config) {
        this.config = config;

        this.components = [
            createOAuth2Cleaner(),
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

        const swagger = new SwaggerService({
            baseUrl: this.config.publicUrl,
        });

        const swaggerCanGenerate = await swagger.canGenerate();
        const swaggerExists = await swagger.exists();
        if (swaggerCanGenerate && !swaggerExists) {
            logger.info('Generating documentation...');

            await swagger.generate();

            logger.info('Generated documentation.');
        }

        const options = await useDataSourceOptions();
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
                        .warn(`The ${this.config.robotAdminName} robot credentials could not saved to vault.`);
                }
            }
        }

        this.components.forEach((component) => component.start());

        logger.info('Starting http server...');

        const router = createRouter();
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
