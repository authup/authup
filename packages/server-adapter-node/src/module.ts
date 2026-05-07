/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { extractBearerToken } from '@authup/server-adapter-kit';
import type { TokenVerificationData } from '@authup/server-adapter-kit';
import type {
    Middleware, 
    MiddlewareOptions, 
    Next, 
    VerifyRequestOptions,
} from './types';

export async function verifyRequest(
    req: IncomingMessage,
    options: VerifyRequestOptions,
): Promise<TokenVerificationData | undefined> {
    let { authorization } = req.headers;

    if (!authorization && options.tokenByRequest) {
        const fallbackToken = options.tokenByRequest(req);
        if (fallbackToken) {
            authorization = fallbackToken.startsWith('Bearer ') ?
                fallbackToken :
                `Bearer ${fallbackToken}`;
        }
    }

    const token = extractBearerToken(authorization);
    if (!token) {
        return undefined;
    }

    return options.tokenVerifier.verify(token);
}

export function createMiddleware(context: MiddlewareOptions) : Middleware {
    return async (req: IncomingMessage, _res: ServerResponse, next: Next) => {
        try {
            const data = await verifyRequest(req, context);
            if (data) {
                context.tokenVerifierHandler(req, data);
            }
        } catch (e) {
            next(e as Error);
            return;
        }

        next();
    };
}
