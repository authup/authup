/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { URL } from 'url';
import { DataSource, DataSourceOptions } from 'typeorm';
import { createDatabase, setDataSource, setupDatabaseSchema } from 'typeorm-extension';
import { createExpressApp, createHttpServer, generateSwaggerDocumentation } from '../http';
import { StartCommandContext } from './type';
import { DatabaseSeeder, buildDataSourceOptions, saveSeedResult } from '../database';
import { buildOAuth2Aggregator } from '../aggregators';
import { useConfig } from '../config';
import { setLogger } from '../logger';

export async function startCommand(context?: StartCommandContext) {
    context = context || {};

    const config = await useConfig();

    if (context.logger) {
        setLogger(context.logger);
    }

    if (context.logger) {
        context.logger.info(`Environment: ${config.env}`);
        context.logger.info(`WritableDirectoryPath: ${config.writableDirectoryPath}`);
        context.logger.info(`URL: ${config.selfUrl}`);
        context.logger.info(`Docs-URL: ${new URL('docs', config.selfUrl).href}`);
        context.logger.info(`Web-URL: ${config.webUrl}`);
    }

    /*
    HTTP Server & Express App
    */

    if (context.logger) {
        context.logger.info('Initialise controllers & middlewares.');
    }

    const expressApp = createExpressApp();

    if (context.logger) {
        context.logger.info('Initialised controllers & middlewares.');
    }

    if (context.logger) {
        context.logger.info('Generating documentation.');
    }

    await generateSwaggerDocumentation({
        rootPath: config.rootPath,
        writableDirectoryPath: config.writableDirectoryPath,
        baseUrl: config.selfUrl,
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

    const seeder = new DatabaseSeeder(config.database);
    const seederData = await seeder.run(dataSource);

    if (seederData.robot) {
        await saveSeedResult(config.writableDirectoryPath, seederData);
    }

    if (context.logger) {
        context.logger.info('Starting aggregators.');
    }

    const { start } = buildOAuth2Aggregator();
    await start();

    if (context.logger) {
        context.logger.info('Started aggregators.');
    }

    const httpServer = createHttpServer({ expressApp });
    httpServer.listen(config.port, '0.0.0.0', () => {
        if (context.logger) {
            context.logger.info('Startup completed.');
        }
    });
}
