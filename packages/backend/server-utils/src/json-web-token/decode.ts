/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { decode } from 'jsonwebtoken';
import { TokenError } from '@authelion/common';
import { TokenDecodeContext } from './type';
import { handleJWTError } from './utils';

/**
 * Decode a JWT token with no verification.
 *
 * @param token
 * @param context
 *
 * @throws TokenError
 */
export async function decodeToken(
    token: string,
    context?: TokenDecodeContext,
): Promise<string | Record<string, any> | null> {
    context ??= {};

    try {
        return decode(token, context.options);
    } catch (e) {
        handleJWTError(e);

        throw e;
    }
}
