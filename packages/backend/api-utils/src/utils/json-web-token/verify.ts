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
export async function verifyToken<T extends string | object | Buffer | Record<string, any>>(
    token: string,
    context?: TokenVerifyContext,
): Promise<T> {
    context ??= {};

    const keyPair: KeyPair = await useKeyPair(context.keyPairOptions);

    context.options ??= {};
    context.options.algorithms = ['RS256'];

    try {
        return await verify(token, keyPair.publicKey, context.options) as T;
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
