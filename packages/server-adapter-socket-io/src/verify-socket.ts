/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { extractBearerToken } from '@authup/server-adapter-kit';
import type { TokenVerificationData } from '@authup/server-adapter-kit';
import type { Socket, VerifySocketOptions } from './types';

export async function verifySocket(
    socket: Socket,
    options: VerifySocketOptions,
): Promise<TokenVerificationData | undefined> {
    let { token } = socket.handshake.auth;

    if ((!token || typeof token !== 'string') && options.tokenBySocket) {
        token = options.tokenBySocket(socket);
    }

    if (!token || typeof token !== 'string') {
        return undefined;
    }

    if (token.startsWith('Bearer ')) {
        token = extractBearerToken(token)!;
    }

    return options.tokenVerifier.verify(token as string, { certificateThumbprint: () => options.certificateThumbprintBySocket?.(socket) });
}
