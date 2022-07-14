/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MiddlewareOptions, MiddlewareSwaggerOptions } from './type';

export function extendMiddlewareOptions(
    options: Partial<MiddlewareOptions>,
    writableDirectoryPath?: string,
) : MiddlewareOptions {
    if (
        typeof options.bodyParser === 'undefined' &&
        typeof options.cookieParser === 'undefined' &&
        typeof options.response === 'undefined' &&
        typeof options.swagger === 'undefined'
    ) {
        options.bodyParser = true;
        options.cookieParser = true;
        options.response = true;
        options.swagger = {
            enabled: true,
            directory: writableDirectoryPath,
        };
    }

    if (!options.swagger) {
        options.swagger = {} as MiddlewareSwaggerOptions;
    }

    if (!options.swagger.directory) {
        options.swagger.directory = writableDirectoryPath;
    }

    return options as MiddlewareOptions;
}
