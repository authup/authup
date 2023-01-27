/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import http from 'node:http';
import { HttpServerContext, HttpServerInterface } from './type';

export function createHttpServer({ router } : HttpServerContext) : HttpServerInterface {
    return new http.Server(router.createListener());
}
