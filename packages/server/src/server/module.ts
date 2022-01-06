/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createConnection } from 'typeorm';
import { buildConnectionOptions } from 'typeorm-extension';
import { createHttpServer } from '../http';
import { createExpressApp } from '../http/express';
import { AuthServerStartContext } from './type';
import { buildDatabaseConnectionOptions } from '../database/utils';

export async function startAuthServer(context: AuthServerStartContext) {
    /*
    HTTP Server & Express App
    */
    const expressApp = createExpressApp({
        writableDirectoryPath: context.config.writableDirectory,
        swaggerDocumentation: context.config.swaggerDocumentation,
        selfUrl: context.config.selfUrl,
        webUrl: context.config.webUrl,
    });

    const httpServer = createHttpServer({ expressApp });

    function signalStart() {
        console.log(`Startup on 127.0.0.1:${context.config.port} (${context.config.env}) completed.`);
    }

    /*
    Start Server
    */
    function start() {
        httpServer.listen(context.config.port, '0.0.0.0', signalStart);
    }

    const connectionOptions = await buildDatabaseConnectionOptions(context.config);
    const connection = await createConnection(connectionOptions);
    if (context.config.env === 'development') {
        await connection.synchronize();
    }

    start();
}
