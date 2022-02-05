/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { decode } from 'jsonwebtoken';
import { TokenError, hasOwnProperty } from '@typescript-auth/domains';
import { TokenDecodeContext } from './type';

/**
 * Decode JWT with no verification.
 *
 * @param token
 * @param context
 *
 * @throws TokenError
 */
export async function decodeToken<T extends string | object | Buffer | Record<string, any>>(
    token: string,
    context?: TokenDecodeContext,
): Promise<T> {
    context ??= {};

    try {
        return await decode(token, context.options) as T;
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
