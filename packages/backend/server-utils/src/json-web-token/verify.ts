/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { verify } from 'jsonwebtoken';
import { TokenError, hasOwnProperty } from '@authelion/common';
import { KeyPair, useKeyPair } from '../key-pair';
import { TokenVerifyOptions } from './type';
import { handleJWTError } from './utils';

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
    context?: TokenVerifyOptions,
): Promise<string | Record<string, any>> {
    context ??= {};

    const { keyPair: keyPairOptions, secret, ...options } = context;

    try {
        if (secret) {
            options.algorithms = options.algorithms || ['HS256', 'HS384', 'HS512'];

            return verify(token, secret, options);
        }

        options.algorithms = options.algorithms || ['RS256', 'RS384', 'RS512'];

        const keyPair: KeyPair = await useKeyPair(keyPairOptions);
        return verify(token, keyPair.publicKey, options);
    } catch (e) {
        handleJWTError(e);

        throw e;
    }
}
