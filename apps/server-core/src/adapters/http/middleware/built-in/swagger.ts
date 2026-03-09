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
import type { Plugin } from 'routup';
import {
    buildFilePath, load, locate,
} from 'locter';
import { AuthupError } from '@authup/errors';

type SwaggerMiddlewareOptions = {
    documentPath: string,
    options?: UIOptions
};
export async function createSwaggerMiddleware(input: Partial<SwaggerMiddlewareOptions> = {}) : Promise<Plugin> {
    let documentPath : string;
    if (input.documentPath) {
        documentPath = path.isAbsolute(input.documentPath) ?
            input.documentPath :
            path.join(process.cwd(), input.documentPath);
    } else {
        const locatorInfo = await locate('**/swagger.json');
        if (!locatorInfo) {
            throw new AuthupError('Swagger file not found.');
        }

        documentPath = buildFilePath(locatorInfo);
    }

    if (!fs.existsSync(documentPath)) {
        throw new AuthupError(`Swagger file ( ${documentPath} ) does not exist.`);
    }

    const document = await load(documentPath);

    return swaggerUI(document, input.options);
}
