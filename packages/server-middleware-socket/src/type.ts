/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TokenVerificationData, TokenVerifier, TokenVerifierOptions } from '@authup/server-middleware-kit';

export type MiddlewareOptions = {
    tokenVerifier: TokenVerifierOptions | TokenVerifier,
    tokenVerifierHandler: (socket: Socket, data: TokenVerificationData) => void
};

export type Next = (err?: Error) => void;

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
