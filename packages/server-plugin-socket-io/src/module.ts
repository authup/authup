/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TokenVerificationData } from '@authup/server-plugin-kit';
import {
    TokenVerifier,
} from '@authup/server-plugin-kit';
import type { MiddlewareOptions, Next, Socket } from './types';

export function createMiddleware(context: MiddlewareOptions) {
    let tokenVerifier : TokenVerifier;
    if (context.tokenVerifier instanceof TokenVerifier) {
        tokenVerifier = context.tokenVerifier;
    } else {
        tokenVerifier = new TokenVerifier(context.tokenVerifier);
    }

    return async (socket: Socket, next: Next) => {
        const { token } = socket.handshake.auth;

        if (!token) {
            return next();
        }

        let data : TokenVerificationData | undefined;

        try {
            data = await tokenVerifier.verify(token);
        } catch (e) {
            return next(e);
        }

        context.tokenVerifierHandler(socket, data);

        return next();
    };
}
