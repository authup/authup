/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { URL } from 'url';
import { DataSource } from 'typeorm';
import path from 'path';
import { setDataSource } from 'typeorm-extension';
import { createExpressApp, createHttpServer } from '../http';
import { StartCommandContext } from './type';
import { buildDataSourceOptions } from '../database';
import { buildOAuth2TokenAggregator } from '../aggregators';
import { useConfig } from '../config';

export async function startCommand(context?: StartCommandContext) {
    context = context || {};

    const config = await useConfig();

    if (context.spinner) {
        context.spinner.info(`Environment: ${config.env}`);
        context.spinner.info(`WritableDirectory: ${path.join(config.rootPath, config.writableDirectory)}`);
        context.spinner.info(`URL: ${config.selfUrl}`);
        context.spinner.info(`Docs-URL: ${new URL('docs', config.selfUrl).href}`);
        context.spinner.info(`Web-URL: ${config.webUrl}`);

        context.spinner.start('Initialise controllers & middlewares.');
    }
    /*
    HTTP Server & Express App
    */
    const expressApp = createExpressApp();

    if (context.spinner) {
        context.spinner.succeed('Initialised controllers & middlewares.');
    }

    const httpServer = createHttpServer({ expressApp });

    if (context.spinner) {
        context.spinner.start('Establish database connection.');
    }

    const options = await buildDataSourceOptions();
    const dataSource = new DataSource(options);
    await dataSource.initialize();

    if (config.env === 'development') {
        await dataSource.synchronize();
    }

    setDataSource(dataSource);

    if (context.spinner) {
        context.spinner.succeed('Established database connection.');

        context.spinner.start('Build & start token aggregator.');
    }

    const { start } = buildOAuth2TokenAggregator();

    await start();

    if (context.spinner) {
        context.spinner.succeed('Built & started token aggregator.');
    }

    httpServer.listen(config.port, '0.0.0.0', () => {
        if (context.spinner) {
            context.spinner.succeed('Startup completed.');
        }
    });
}
