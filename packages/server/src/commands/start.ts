/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { URL } from 'url';
import { DataSource, DataSourceOptions } from 'typeorm';
import { createDatabase, setDataSource, setupDatabaseSchema } from 'typeorm-extension';
import {
    createHttpServer, createRouter, generateSwaggerDocumentation, runOAuth2Cleaner, useConfig as useHTTPConfig,
} from '@authup/server-http';
import { DatabaseSeeder, buildDataSourceOptions, saveSeedResult } from '@authup/server-database';
import { setLogger } from '@authup/server-common';
import { StartCommandContext } from './type';

export async function startCommand(context?: StartCommandContext) {
    context = context || {};

    const config = await useHTTPConfig();

    if (context.logger) {
        setLogger(context.logger);
    }

    if (context.logger) {
        context.logger.info(`Environment: ${config.get('env')}`);
        context.logger.info(`WritableDirectoryPath: ${config.get('writableDirectoryPath')}`);
        context.logger.info(`URL: ${config.get('selfUrl')}`);
        context.logger.info(`Docs-URL: ${new URL('docs/', config.get('selfUrl')).href}`);
        context.logger.info(`UI-URL: ${config.get('uiUrl')}`);
    }

    /*
    HTTP Server & Express App
    */

    if (context.logger) {
        context.logger.info('Initialise controllers & middlewares.');
    }

    if (context.logger) {
        context.logger.info('Initialised controllers & middlewares.');
    }

    if (context.logger) {
        context.logger.info('Generating documentation.');
    }

    await generateSwaggerDocumentation({
        rootPath: config.get('rootPath'),
        writableDirectoryPath: config.get('writableDirectoryPath'),
        baseUrl: config.get('selfUrl'),
    });

    if (context.logger) {
        context.logger.info('Generated documentation.');
    }

    const options = context.dataSourceOptions || await buildDataSourceOptions();

    await createDatabase({ options, synchronize: false, ifNotExist: true });

    Object.assign(options, {
        logging: ['error'],
    } as DataSourceOptions);

    if (context.logger) {
        context.logger.info('Establish database connection.');
    }

    const dataSource = new DataSource(options);
    await dataSource.initialize();

    setDataSource(dataSource);

    if (context.logger) {
        context.logger.info('Established database connection.');
    }

    if (context.logger) {
        context.logger.info('Initialise database schema.');
    }

    await setupDatabaseSchema(dataSource);

    if (context.logger) {
        context.logger.info('Initialised database schema.');
    }

    const seeder = new DatabaseSeeder();
    const seederData = await seeder.run(dataSource);

    if (seederData.robot) {
        await saveSeedResult(config.get('writableDirectoryPath'), seederData);
    }

    if (context.logger) {
        context.logger.info('Starting oauth2 cleaner.');
    }

    Promise.resolve()
        .then(runOAuth2Cleaner);

    if (context.logger) {
        context.logger.info('Started oauth2 cleaner.');
    }

    const router = createRouter();
    const httpServer = createHttpServer({ router });
    httpServer.listen(config.get('port'), '0.0.0.0', () => {
        if (context.logger) {
            context.logger.info('Startup completed.');
        }
    });
}
