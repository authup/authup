/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    AbilityManager,
} from '@authup/core';
import type { Socket, SocketMiddlewareContext, SocketNextFunction } from './type';
import type { TokenVerifierOutput } from '../../verifier';
import {
    TokenVerifier,
} from '../../verifier';

export function setupSocketMiddleware(context: SocketMiddlewareContext) {
    const tokenVerifier = new TokenVerifier(context.tokenVerifier);

    return async (socket: Socket, next: SocketNextFunction) => {
        const { token } = socket.handshake.auth;

        if (!token) {
            socket.data.ability = new AbilityManager();

            return next();
        }

        let data : TokenVerifierOutput | undefined;

        try {
            data = await tokenVerifier.verify(token);
        } catch (e) {
            return next(e);
        }

        const keys = Object.keys(data);
        for (let i = 0; i < keys.length; i++) {
            socket.data[keys[i]] = data[keys[i]];
        }

        return next();
    };
}
