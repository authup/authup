/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import defu from 'defu';
import { ConfigInput } from '../../type';
import {
    MiddlewareOptions, MiddlewareOptionsInput,
} from '../type';
import { extendMiddlewareOptionsWithDefaults } from './defaults';
import { extractMiddlewareOptionsFromEnv } from './env';

export function buildMiddlewareOptions(input: MiddlewareOptionsInput) : MiddlewareOptions {
    return extendMiddlewareOptionsWithDefaults(input);
}

export function buildMiddlewareOptionsFromConfig(config: ConfigInput) : MiddlewareOptions {
    const options = config.middleware || {};
    options.swaggerDirectoryPath = options.swaggerDirectoryPath || config.writableDirectoryPath;

    return buildMiddlewareOptions(
        defu(
            extractMiddlewareOptionsFromEnv(),
            options,
        ),
    );
}
