/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import http from 'node:http';
import type { RequestListener } from 'node:http';
import { toNodeHandler } from 'routup/node';
import type { HttpServerContext, IServer } from './type.ts';

export function createHttpServer({ router } : HttpServerContext) : IServer {
    return new http.Server(toNodeHandler(router) as unknown as RequestListener);
}
