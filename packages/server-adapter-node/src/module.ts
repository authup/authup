/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { extractBearerToken } from '@authup/server-adapter-kit';
import type { Middleware, MiddlewareOptions, Next } from './types';

export function createMiddleware(context: MiddlewareOptions) : Middleware {
    return async (req: IncomingMessage, _res: ServerResponse, next: Next) => {
        let { authorization } = req.headers;

        if (!authorization && context.tokenByRequest) {
            const fallbackToken = context.tokenByRequest(req);
            if (fallbackToken) {
                authorization = fallbackToken.startsWith('Bearer') ?
                    fallbackToken :
                    `Bearer ${fallbackToken}`;
            }
        }

        try {
            const token = extractBearerToken(authorization);
            if (!token) {
                next();
                return;
            }

            const data = await context.tokenVerifier.verify(token);
            context.tokenVerifierHandler(req, data);
        } catch (e) {
            next(e as Error);
            return;
        }

        next();
    };
}
