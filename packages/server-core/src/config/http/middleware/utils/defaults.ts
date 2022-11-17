/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { HTTPMiddlewareOptions } from '../type';

export function extendHTTPMiddlewareOptionsWithDefaults(input: Partial<HTTPMiddlewareOptions>) : HTTPMiddlewareOptions {
    if (!input.swaggerDirectoryPath) {
        input.swaggerDirectoryPath = path.join(process.cwd(), 'writable');
    }

    if (!path.isAbsolute(input.swaggerDirectoryPath)) {
        input.swaggerDirectoryPath = path.join(process.cwd(), input.swaggerDirectoryPath);
    }

    return {
        bodyParser: input.bodyParser ?? true,
        cookieParser: input.cookieParser ?? true,
        response: input.response ?? true,
        swaggerEnabled: input.swaggerEnabled ?? true,
        swaggerDirectoryPath: input.swaggerDirectoryPath,
    };
}
