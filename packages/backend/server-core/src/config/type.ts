/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DatabaseOptions, DatabaseOptionsInput } from './database';
import { HTTPMiddlewareOptions, HTTPMiddlewareOptionsInput } from './http/middleware';
import { CoreOptions, CoreOptionsInput } from './core';

export type Config = CoreOptions & {
    database: DatabaseOptions,
    middleware: HTTPMiddlewareOptions
};

export type ConfigInput = CoreOptionsInput & {
    database?: DatabaseOptionsInput,
    middleware?: HTTPMiddlewareOptionsInput
};
