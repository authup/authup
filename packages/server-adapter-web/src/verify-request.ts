/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { extractBearerToken } from '@authup/server-adapter-kit';
import type { TokenVerificationData } from '@authup/server-adapter-kit';
import type { VerifyRequestOptions } from './types';

export async function verifyRequest(
    request: Request,
    options: VerifyRequestOptions,
): Promise<TokenVerificationData | undefined> {
    let authorization = request.headers.get('authorization') ?? undefined;

    if (!authorization && options.tokenByRequest) {
        const fallbackToken = options.tokenByRequest(request);
        if (fallbackToken) {
            authorization = fallbackToken.startsWith('Bearer ') ?
                fallbackToken :
                `Bearer ${fallbackToken}`;
        }
    }

    const token = extractBearerToken(authorization);
    if (!token) {
        return undefined;
    }

    return options.tokenVerifier.verify(token, { certificateThumbprint: () => options.certificateThumbprintByRequest?.(request) });
}
