/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Socket, SocketMiddlewareOptions, SocketNextFunction } from './type';
import type { TokenVerificationData } from '../../verifier';
import {
    TokenVerifier,
} from '../../verifier';

export function createSocketMiddleware(context: SocketMiddlewareOptions) {
    let tokenVerifier : TokenVerifier;
    if (context.tokenVerifier instanceof TokenVerifier) {
        tokenVerifier = context.tokenVerifier;
    } else {
        tokenVerifier = new TokenVerifier(context.tokenVerifier);
    }

    return async (socket: Socket, next: SocketNextFunction) => {
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
