/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import defu from 'defu';
import {
    HTTPMiddlewareOptions, HTTPMiddlewareOptionsInput,
} from '../type';
import { extendHTTPMiddlewareOptionsWithDefaults } from './defaults';
import { extractHTTPMiddlewareOptionsFromEnv } from './env';
import { validateHTTPMiddlewareOptionsInput } from './validate';

export function buildHTTPMiddlewareOptions(options?: HTTPMiddlewareOptionsInput) : HTTPMiddlewareOptions {
    options = options || {};

    return extendHTTPMiddlewareOptionsWithDefaults(
        validateHTTPMiddlewareOptionsInput(
            defu(
                extractHTTPMiddlewareOptionsFromEnv(),
                options,
            ),
        ),
    );
}
