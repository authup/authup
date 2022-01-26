/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { URL } from 'url';
import { createConnection } from 'typeorm';
import * as ora from 'ora';
import path from 'path';
import { createExpressApp, createHttpServer } from '../http';
import { StartCommandContext } from './type';
import { buildDatabaseConnectionOptions } from '../database';

export async function startCommand(context: StartCommandContext) {
    const spinner = ora.default({
        spinner: 'dots',
    });

    spinner.info(`Environment: ${context.config.env}`);
    spinner.info(`WritableDirectory: ${path.join(context.config.rootPath, context.config.writableDirectory)}`);
    spinner.info(`URL: ${context.config.selfUrl}`);
    spinner.info(`Docs-URL: ${new URL('docs', context.config.selfUrl).href}`);
    spinner.info(`Web-URL: ${context.config.webUrl}`);

    spinner.start('Initialise controllers & middlewares.');
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

    spinner.succeed('Initialised controllers & middlewares.');

    const httpServer = createHttpServer({ expressApp });

    spinner.start('Establish database connection.');

    const connectionOptions = await buildDatabaseConnectionOptions(context.config, context.databaseConnectionMerge);
    const connection = await createConnection(connectionOptions);
    if (context.config.env === 'development') {
        await connection.synchronize();
    }

    spinner.succeed('Established database connection.');

    httpServer.listen(context.config.port, '0.0.0.0', () => {
        spinner.succeed('Startup completed.');
    });
}
