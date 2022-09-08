/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { Config } from '../type';
import { MiddlewareOptions } from './type';
import { removePrefixFromConfigKey } from '../utils';

export function extendMiddlewareOptions(options: Partial<MiddlewareOptions>) : MiddlewareOptions {
    return {
        bodyParser: options.bodyParser ?? true,
        cookieParser: options.cookieParser ?? true,
        response: options.response ?? true,
        swaggerEnabled: options.swaggerEnabled ?? true,
        swaggerDirectoryPath: options.swaggerDirectoryPath ||
            path.join(process.cwd(), 'writable'),
    };
}

export function buildMiddlewareOptionsFromConfig(config: Config) : MiddlewareOptions {
    const data : Partial<MiddlewareOptions> = {
        swaggerDirectoryPath: config.middlewareSwaggerDirectoryPath ||
            config.writableDirectoryPath,
    };

    const keys = Object.keys(config);
    for (let i = 0; i < keys.length; i++) {
        if (keys[i].startsWith('middleware')) {
            const targetKey = removePrefixFromConfigKey(keys[i], 'middleware');
            data[targetKey] = config[keys[i]];
        }
    }

    return extendMiddlewareOptions(data);
}
