/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {createConnection} from "typeorm";
import {buildConnectionOptions} from 'typeorm-extension';
import {createHttpServer} from "../http";
import {createExpressApp} from "../http/express";
import {AuthServerStartContext} from "./type";

export async function startAuthServer(context: AuthServerStartContext) {
    /*
    HTTP Server & Express App
    */
    const expressApp = createExpressApp({
        writableDirectoryPath: context.writableDirectoryPath,
        swaggerDocumentation: context.swaggerDocumentation,
        selfUrl: context.selfUrl,
        webUrl: context.webUrl
    });

    const httpServer = createHttpServer({ expressApp });

    function signalStart() {
        console.log(`Startup on 127.0.0.1:${context.port} (${context.env}) completed.`);
    }

    /*
    Start Server
    */
    function start() {
        httpServer.listen(context.port, '0.0.0.0', signalStart);
    }

    const connectionOptions = await buildConnectionOptions();
    const connection = await createConnection(connectionOptions);
    if (context.env === 'development') {
        await connection.synchronize();
    }

    start();
}
