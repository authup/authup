/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { decode } from 'jsonwebtoken';
import { TokenError, hasOwnProperty } from '@authelion/common';
import { TokenDecodeContext } from './type';

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
): Promise<string | Record<string, any>> {
    context ??= {};

    try {
        return decode(token, context.options);
    } catch (e) {
        if (
            e &&
            hasOwnProperty(e, 'name')
        ) {
            switch (e.name) {
                case 'TokenExpiredError':
                    throw TokenError.expired();
                case 'NotBeforeError':
                    throw TokenError.notActiveBefore(e.date);
                case 'JsonWebTokenError':
                    throw TokenError.payloadInvalid(e.message);
            }
        }

        throw new TokenError({
            previous: e,
            decorateMessage: true,
            logMessage: true,
        });
    }
}
