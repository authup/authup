/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { URL } from 'url';
import { DataSource } from 'typeorm';
import { setDataSource } from 'typeorm-extension';
import { createExpressApp, createHttpServer } from '../http';
import { StartCommandContext } from './type';
import { buildDataSourceOptions } from '../database';
import { buildOAuth2Aggregator } from '../aggregators';
import { setConfig, useConfig } from '../config';

export async function startCommand(context?: StartCommandContext) {
    context = context || {};

    const config = await useConfig();
    config.adminPasswordReset ??= false;
    config.robotSecretReset ??= false;
    setConfig(config);

    if (context.spinner) {
        context.spinner.info(`Environment: ${config.env}`);
        context.spinner.info(`WritableDirectoryPath: ${config.writableDirectoryPath}`);
        context.spinner.info(`URL: ${config.selfUrl}`);
        context.spinner.info(`Docs-URL: ${new URL('docs', config.selfUrl).href}`);
        context.spinner.info(`Web-URL: ${config.webUrl}`);
    }

    /*
    HTTP Server & Express App
    */

    if (context.spinner) {
        context.spinner.start('Initialise controllers & middlewares.');
    }

    const expressApp = createExpressApp();

    if (context.spinner) {
        context.spinner.succeed('Initialised controllers & middlewares.');
    }

    if (context.spinner) {
        context.spinner.start('Establish database connection.');
    }

    const options = context.dataSourceOptions || await buildDataSourceOptions();
    const dataSource = new DataSource(options);
    await dataSource.initialize();

    setDataSource(dataSource);

    if (context.spinner) {
        context.spinner.succeed('Established database connection.');

        context.spinner.start('Starting aggregators.');
    }

    const { start } = buildOAuth2Aggregator();
    await start();

    if (context.spinner) {
        context.spinner.succeed('Started aggregators.');
    }

    const httpServer = createHttpServer({ expressApp });
    httpServer.listen(config.port, '0.0.0.0', () => {
        if (context.spinner) {
            context.spinner.succeed('Startup completed.');
        }
    });
}
