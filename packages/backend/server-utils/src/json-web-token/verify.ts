/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { verify } from 'jsonwebtoken';
import { TokenError, hasOwnProperty } from '@authelion/common';
import { KeyPair, useKeyPair } from '../key-pair';
import { TokenVerifyContext } from './type';

/**
 * Verify JWT.
 *
 * @param token
 * @param context
 *
 * @throws TokenError
 */
export async function verifyToken(
    token: string,
    context?: TokenVerifyContext,
): Promise<string | Record<string, any>> {
    context ??= {};

    const keyPair: KeyPair = await useKeyPair(context.keyPair);
    context.options ??= {};

    try {
        if (context.secret) {
            context.options.algorithms = context.options.algorithms || ['HS256', 'HS384', 'HS512'];

            return verify(token, context.secret, context.options);
        }

        context.options.algorithms = context.options.algorithms || ['RS256', 'RS384', 'RS512'];

        return verify(token, keyPair.publicKey, context.options);
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
            statusCode: 401,
            previous: e,
            decorateMessage: true,
            logMessage: true,
        });
    }
}
