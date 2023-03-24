/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasConfig as hasRedisConfig } from 'redis-extension';
import {
    hasVaultConfig, saveRobotCredentialsToVault, setLogger, useLogger,
} from '@authup/server-common';
import { URL } from 'url';
import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';
import {
    checkDatabase,
    createDatabase,
    setDataSource,
    setupDatabaseSchema,
} from 'typeorm-extension';
import {
    createHttpServer, createRouter, generateSwaggerDocumentation, runOAuth2Cleaner, useConfig as useHTTPConfig,
} from '@authup/server-http';
import {
    DatabaseSeeder, buildDataSourceOptions, saveSeedResult, useConfig as useDatabaseConfig,
} from '@authup/server-database';
import type { StartCommandContext } from './type';

export async function startCommand(context?: StartCommandContext) {
    context = context || {};

    const httpConfig = await useHTTPConfig();
    const databaseConfig = await useDatabaseConfig();

    if (context.logger) {
        setLogger(context.logger);
    }

    const logger = useLogger();

    logger.info(`Environment: ${httpConfig.get('env')}`);
    logger.info(`WritableDirectoryPath: ${httpConfig.get('writableDirectoryPath')}`);
    logger.info(`Port: ${httpConfig.get('port')}`);
    logger.info(`Host: ${httpConfig.get('host')}`);
    logger.info(`Public-URL: ${httpConfig.get('publicUrl')}`);
    logger.info(`Docs-URL: ${new URL('docs', httpConfig.get('publicUrl')).href}`);

    logger.info(`Redis: ${hasRedisConfig() ? 'enabled' : 'disabled'}`);
    logger.info(`Vault: ${hasVaultConfig() ? 'enabled' : 'disabled'}`);
    logger.info(`Robot: ${databaseConfig.get('robotEnabled') ? 'enabled' : 'disabled'}`);

    /*
    HTTP Server & Express App
    */

    logger.info('Generating documentation...');

    await generateSwaggerDocumentation({
        rootPath: httpConfig.get('rootPath'),
        writableDirectoryPath: httpConfig.get('writableDirectoryPath'),
        baseUrl: httpConfig.get('publicUrl'),
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
        await saveRobotCredentialsToVault(seederData.robot);

        await saveSeedResult(httpConfig.get('writableDirectoryPath'), seederData);
    }

    logger.info('Starting oauth2 cleaner...');

    Promise.resolve()
        .then(runOAuth2Cleaner);

    logger.info('Started oauth2 cleaner.');

    logger.info('Starting http server...');

    const router = createRouter();
    const httpServer = createHttpServer({ router });
    httpServer.listen(httpConfig.get('port'), httpConfig.get('host'), () => {
        logger.info('Started http server.');
    });
}
