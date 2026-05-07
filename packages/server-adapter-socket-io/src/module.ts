/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { extractBearerToken } from '@authup/server-adapter-kit';
import type { MiddlewareOptions, Next, Socket } from './types';

export function createMiddleware(context: MiddlewareOptions) {
    return async (socket: Socket, next: Next) => {
        let { token } = socket.handshake.auth;

        if (!token || typeof token !== 'string') {
            return next();
        }

        try {
            if (token.startsWith('Bearer ')) {
                token = extractBearerToken(token)!;
            }
            const data = await context.tokenVerifier.verify(token);
            context.tokenVerifierHandler(socket, data);
        } catch (e) {
            return next(e as Error);
        }

        return next();
    };
}
