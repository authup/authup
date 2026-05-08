/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Middleware, MiddlewareOptions, Next } from './types';
import { verifyRequest } from './verify-request';

export function createMiddleware(context: MiddlewareOptions): Middleware {
    return async (req: IncomingMessage, _res: ServerResponse, next: Next) => {
        try {
            const data = await verifyRequest(req, context);
            if (data) {
                await context.tokenVerifierHandler(req, data);
            }
        } catch (e) {
            next(e as Error);
            return;
        }

        next();
    };
}
