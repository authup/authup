/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import type { UIOptions } from '@routup/swagger';
import { swaggerUI } from '@routup/swagger';
import { buildFilePath, loadSync, locateSync } from 'locter';
import type { Router } from 'routup';
import { useLogger } from '@authup/server-kit';

type SwaggerMiddlewareOptions = {
    documentPath: string,
    mountPath: string,
    options?: UIOptions
};
export function registerSwaggerMiddleware(router: Router, input: Partial<SwaggerMiddlewareOptions> = {}) {
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

        documentPath = buildFilePath(locatorInfo);
    }

    if (!fs.existsSync(documentPath)) {
        useLogger().warn(`Swagger file ( ${documentPath} ) does not exist.`);
        return;
    }

    const document = loadSync(documentPath);
    router.use(mountPath, swaggerUI(document, input.options));
}
