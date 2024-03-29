/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TokenVerificationData, TokenVerifier, TokenVerifierOptions } from '../../verifier';

export type SocketMiddlewareOptions = {
    tokenVerifier: TokenVerifierOptions | TokenVerifier,
    tokenVerifierHandler: (socket: Socket, data: TokenVerificationData) => void
};

export type SocketNextFunction = (err?: Error) => void;

export type Handshake = {
    auth: {
        [key: string]: any;
    },
    [key: string]: any
};

export type Socket = {
    handshake: Handshake,
    [key: string]: any
};
