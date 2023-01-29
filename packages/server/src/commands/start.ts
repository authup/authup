/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasConfig } from 'redis-extension';
import { URL } from 'url';
import { DataSource, DataSourceOptions } from 'typeorm';
import {
    checkDatabase,
    createDatabase,
    setDataSource,
    setupDatabaseSchema,
} from 'typeorm-extension';
import {
    createHttpServer, createRouter, generateSwaggerDocumentation, runOAuth2Cleaner, useConfig as useHTTPConfig,
} from '@authup/server-http';
import { DatabaseSeeder, buildDataSourceOptions, saveSeedResult } from '@authup/server-database';
import { setLogger, useLogger } from '@authup/server-common';
import { StartCommandContext } from './type';

export async function startCommand(context?: StartCommandContext) {
    context = context || {};

    const config = await useHTTPConfig();

    if (context.logger) {
        setLogger(context.logger);
    }

    const logger = useLogger();

    logger.info(`Redis: ${hasConfig()}`);
    logger.info(`Environment: ${config.get('env')}`);
    logger.info(`WritableDirectoryPath: ${config.get('writableDirectoryPath')}`);
    logger.info(`Port: ${config.get('port')}`);
    logger.info(`Host: ${config.get('host')}`);
    logger.info(`Public-URL: ${config.get('publicUrl')}`);
    logger.info(`Docs-URL: ${new URL('docs/', config.get('publicUrl')).href}`);

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
