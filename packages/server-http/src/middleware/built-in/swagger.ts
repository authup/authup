/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useLogger } from '@authup/server-common';
import { createUIHandler } from '@routup/swagger';
import { buildLoaderFilePath, loadSync, locateSync } from 'locter';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Router } from 'routup';

type SwaggerMiddlewareOptions = {
    documentPath: string,

    mountPath: string
};
export function registerSwaggerMiddleware(router: Router, input?: Partial<SwaggerMiddlewareOptions>) {
    input = input || {};

    const mountPath : string = input.mountPath || '/docs';
    let documentPath : string;
    if (input.documentPath) {
        documentPath = path.isAbsolute(input.documentPath) ?
            input.documentPath :
            path.join(process.cwd(), input.documentPath);
    } else {
        const locatorInfo = locateSync('**/swagger.json');
        if (!locatorInfo) {
            return;
        }

        documentPath = buildLoaderFilePath(locatorInfo, true);
    }

    if (!fs.existsSync(documentPath)) {
        useLogger().warn(`Swagger file ( ${documentPath} ) does not exist.`);
        return;
    }

    const document = loadSync(documentPath);
    router.use(mountPath, createUIHandler(document));
}
