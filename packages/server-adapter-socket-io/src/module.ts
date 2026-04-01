/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MiddlewareOptions, Next, Socket } from './types';

export function createMiddleware(context: MiddlewareOptions) {
    return async (socket: Socket, next: Next) => {
        const {
            token 
        } = socket.handshake.auth;

        if (!token || typeof token !== 'string') {
            return next();
        }

        try {
            const data = await context.tokenVerifier.verify(token);
            context.tokenVerifierHandler(socket, data);
        } catch (e) {
            return next(e as Error);
        }

        return next();
    };
}
