/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { URL } from 'url';
import { DataSource, createConnection } from 'typeorm';
import path from 'path';
import { createExpressApp, createHttpServer } from '../http';
import { StartCommandContext } from './type';
import { buildDataSourceOptions, setDataSource } from '../database';
import { buildTokenAggregator } from '../aggregators';
import { useConfig } from '../config';

export async function startCommand(context: StartCommandContext) {
    context.config ??= useConfig();

    if (context.spinner) {
        context.spinner.info(`Environment: ${context.config.env}`);
        context.spinner.info(`WritableDirectory: ${path.join(context.config.rootPath, context.config.writableDirectory)}`);
        context.spinner.info(`URL: ${context.config.selfUrl}`);
        context.spinner.info(`Docs-URL: ${new URL('docs', context.config.selfUrl).href}`);
        context.spinner.info(`Web-URL: ${context.config.webUrl}`);

        context.spinner.start('Initialise controllers & middlewares.');
    }
    /*
    HTTP Server & Express App
    */
    const expressApp = createExpressApp({
        writableDirectoryPath: path.join(context.config.rootPath, context.config.writableDirectory),
        swaggerDocumentation: context.config.swaggerDocumentation,
        selfUrl: context.config.selfUrl,
        webUrl: context.config.webUrl,
        tokenMaxAge: context.config.tokenMaxAge,
        redis: context.config.redis,
    });

    if (context.spinner) {
        context.spinner.succeed('Initialised controllers & middlewares.');
    }

    const httpServer = createHttpServer({ expressApp });

    if (context.spinner) {
        context.spinner.start('Establish database connection.');
    }

    const options = await buildDataSourceOptions(context.config, context.databaseConnectionMerge);
    const dataSource = new DataSource(options);

    await dataSource.initialize();

    if (context.config.env === 'development') {
        await dataSource.synchronize();
    }

    setDataSource(dataSource);

    if (context.spinner) {
        context.spinner.succeed('Established database connection.');

        context.spinner.start('Build & start token aggregator.');
    }

    const { start } = buildTokenAggregator(context.config.redis);

    await start();

    if (context.spinner) {
        context.spinner.succeed('Built & started token aggregator.');
    }

    httpServer.listen(context.config.port, '0.0.0.0', () => {
        if (context.spinner) {
            context.spinner.succeed('Startup completed.');
        }
    });
}
