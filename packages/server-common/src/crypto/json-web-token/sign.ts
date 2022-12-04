/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { sign } from 'jsonwebtoken';
import { KeyType, TokenError } from '@authup/common';
import { isKeyPair, useKeyPair } from '../key-pair';
import { TokenSignOptions } from './type';

export async function signToken(
    payload: string | object | Buffer | Record<string, any>,
    context: TokenSignOptions,
): Promise<string> {
    context.expiresIn = context.expiresIn || 3600;

    switch (context.type) {
        case KeyType.RSA:
        case KeyType.EC: {
            const { type, keyPair, ...options } = context;
            const { privateKey } = isKeyPair(keyPair) ?
                keyPair :
                await useKeyPair(keyPair);

            if (type === KeyType.RSA) {
                options.algorithm = options.algorithm || 'RS256';
            } else {
                options.algorithm = options.algorithm || 'ES256';
            }

            return sign(payload, privateKey, options);
        }
        case KeyType.OCT: {
            const { type, secret, ...options } = context;
            options.algorithm = options.algorithm || 'HS256';

            return sign(payload, secret, options);
        }
    }

    throw new TokenError();
}
