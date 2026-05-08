/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MiddlewareOptions, Next, Socket } from './types';
import { verifySocket } from './verify-socket';

export function createMiddleware(context: MiddlewareOptions) {
    return async (socket: Socket, next: Next) => {
        try {
            const data = await verifySocket(socket, context);
            if (data) {
                await context.tokenVerifierHandler(socket, data);
            }
        } catch (e) {
            return next(e as Error);
        }

        return next();
    };
}
