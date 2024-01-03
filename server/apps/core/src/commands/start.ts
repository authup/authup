/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { URL } from 'url';
import { ROBOT_SYSTEM_NAME } from '@authup/core';
import { hasClient as hasVaultClient } from '@hapic/vault';
import { hasConfig as hasRedisConfig } from 'redis-extension';
import {
    setLogger, useLogger,
} from '@authup/server-kit';
import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';
import {
    checkDatabase,
    createDatabase,
    setDataSource,
    synchronizeDatabaseSchema,
} from 'typeorm-extension';
import { useConfig } from '../config';
import { DatabaseSeeder, buildDataSourceOptions, saveSeedResult } from '../database';
import { saveRobotCredentialsToVault } from '../domains';
import {
    createHttpServer, createRouter, generateSwaggerDocumentation, runOAuth2Cleaner,
} from '../http';
import type { StartCommandContext } from './type';

export async function startCommand(context?: StartCommandContext) {
    context = context || {};

    const config = useConfig();

    if (context.logger) {
        setLogger(context.logger);
    }

    const logger = useLogger();

    logger.info(`Environment: ${config.env}`);
    logger.info(`WritableDirectoryPath: ${config.writableDirectoryPath}`);
    logger.info(`Port: ${config.port}`);
    logger.info(`Host: ${config.host}`);
    logger.info(`Public-URL: ${config.publicUrl}`);
    logger.info(`Docs-URL: ${new URL('docs', config.publicUrl).href}`);

    const database = config.db;
    logger.info(`Database: ${database.type}`);
    logger.info(`Redis: ${hasRedisConfig() ? 'enabled' : 'disabled'}`);
    logger.info(`Vault: ${hasVaultClient() ? 'enabled' : 'disabled'}`);
    logger.info(`Robot: ${config.robotEnabled ? 'enabled' : 'disabled'}`);

    /*
    HTTP Server & Express App
    */

    logger.info('Generating documentation...');

    await generateSwaggerDocumentation({
        rootPath: config.rootPath,
        writableDirectoryPath: config.writableDirectoryPath,
        baseUrl: config.publicUrl,
    });

    logger.info('Generated documentation.');

    const options = context.dataSourceOptions || await buildDataSourceOptions();
    Object.assign(options, {
        logging: ['error'],
    } as DataSourceOptions);

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

    logger.info('Established database connection.');

    if (!check.schema) {
        logger.info('Applying database schema...');

        await synchronizeDatabaseSchema(dataSource);

        logger.info('Applied database schema.');
    }

    const seeder = new DatabaseSeeder({
        adminPasswordReset: context.databaseAdminPasswordReset ?? false,
        robotSecretReset: context.databaseRobotSecretReset ?? false,
    });

    if (!check.schema) {
        logger.info('Seeding database...');
    }

    const seederData = await seeder.run(dataSource);

    if (!check.schema) {
        logger.info('Seeded database');
    }

    if (seederData.robot) {
        try {
            await saveRobotCredentialsToVault(seederData.robot);
        } catch (e) {
            useLogger().warn(`The ${ROBOT_SYSTEM_NAME} robot credentials could not saved to vault.`);
        }

        await saveSeedResult(config.writableDirectoryPath, seederData);
    }

    logger.info('Starting oauth2 cleaner...');

    Promise.resolve()
        .then(runOAuth2Cleaner);

    logger.info('Started oauth2 cleaner.');

    logger.info('Starting http server...');

    const router = createRouter();
    const httpServer = createHttpServer({ router });
    httpServer.listen(config.port, config.host, () => {
        logger.info('Started http server.');
    });
}
