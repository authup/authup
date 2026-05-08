/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ITokenVerifier, TokenVerificationData } from '@authup/server-adapter-kit';

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

export type VerifySocketOptions = {
    tokenVerifier: ITokenVerifier,
    tokenBySocket?: (socket: Socket) => string | undefined,
};

export type MiddlewareOptions = VerifySocketOptions & {
    tokenVerifierHandler: (socket: Socket, data: TokenVerificationData) => void | Promise<void>
};

export type Next = (err?: Error) => void;
