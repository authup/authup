/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { Config } from '../../config';
import { MiddlewareOptions } from './type';

export function extendMiddlewareOptions(options: Partial<MiddlewareOptions>) : MiddlewareOptions {
    return {
        bodyParser: options.bodyParser ?? true,
        cookieParser: options.cookieParser ?? true,
        response: options.response ?? true,
        swagger: {
            enabled: options.swagger?.enabled ?? true,
            directory: options.swagger?.directory || path.join(process.cwd(), 'writable'),
        },
    };
}

export function buildMiddlewareOptionsFromConfig(config: Config) : MiddlewareOptions {
    return extendMiddlewareOptions({
        bodyParser: config.middlewareBodyParser,
        cookieParser: config.middlewareCookieParser,
        response: config.middlewareResponse,
        swagger: {
            enabled: config.middlewareSwaggerEnabled,
            directory: config.middlewareSwaggerDirectoryPath || config.writableDirectoryPath,
        },
    });
}
