/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { MiddlewareOptions } from '../type';

export function extendMiddlewareOptionsWithDefaults(input: Partial<MiddlewareOptions>) : MiddlewareOptions {
    return {
        bodyParser: input.bodyParser ?? true,
        cookieParser: input.cookieParser ?? true,
        response: input.response ?? true,
        swaggerEnabled: input.swaggerEnabled ?? true,
        swaggerDirectoryPath: input.swaggerDirectoryPath ||
            path.join(process.cwd(), 'writable'),
    };
}
