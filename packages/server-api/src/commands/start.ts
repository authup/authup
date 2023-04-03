/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ROBOT_SYSTEM_NAME } from '@authup/core';
import { hasConfig as hasVaultConfig } from '@hapic/vault';
import { hasConfig as hasRedisConfig } from 'redis-extension';
import {
    setLogger, useLogger,
} from '@authup/server-core';
import { URL } from 'url';
import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';
import {
    checkDatabase,
    createDatabase,
    setDataSource,
    setupDatabaseSchema,
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

    const config = await useConfig();

    if (context.logger) {
        setLogger(context.logger);
    }

    const logger = useLogger();

    logger.info(`Environment: ${config.get('env')}`);
    logger.info(`WritableDirectoryPath: ${config.get('writableDirectoryPath')}`);
    logger.info(`Port: ${config.get('port')}`);
    logger.info(`Host: ${config.get('host')}`);
    logger.info(`Public-URL: ${config.get('publicUrl')}`);
    logger.info(`Docs-URL: ${new URL('docs', config.get('publicUrl')).href}`);

    const database = config.get('db');
    logger.info(`Database: ${database.type}`);
    logger.info(`Redis: ${hasRedisConfig() ? 'enabled' : 'disabled'}`);
    logger.info(`Vault: ${hasVaultConfig() ? 'enabled' : 'disabled'}`);
    logger.info(`Robot: ${config.get('robotEnabled') ? 'enabled' : 'disabled'}`);

    /*
    HTTP Server & Express App
    */

    logger.info('Generating documentation...');

    await generateSwaggerDocumentation({
        rootPath: config.get('rootPath'),
        writableDirectoryPath: config.get('writableDirectoryPath'),
        baseUrl: config.get('publicUrl'),
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

        await setupDatabaseSchema(dataSource);

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

        await saveSeedResult(config.get('writableDirectoryPath'), seederData);
    }

    logger.info('Starting oauth2 cleaner...');

    Promise.resolve()
        .then(runOAuth2Cleaner);

    logger.info('Started oauth2 cleaner.');

    logger.info('Starting http server...');

    const router = createRouter();
    const httpServer = createHttpServer({ router });
    httpServer.listen(config.get('port'), config.get('host'), () => {
        logger.info('Started http server.');
    });
}
