/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Jwt, JwtPayload } from 'jsonwebtoken';
import { verify } from 'jsonwebtoken';
import { KeyType, TokenError } from '@authup/common';
import { isKeyPair, useKeyPair } from '../key-pair';
import type { TokenVerifyOptions } from './type';
import { handleJWTError } from './utils';

/**
 * Verify JWT.
 *
 * @param token
 * @param context
 *
 * @throws TokenError
 */
export async function verifyToken(token: string, context: TokenVerifyOptions & { complete: true }): Promise<string | Jwt>;
export async function verifyToken(token: string, context: TokenVerifyOptions): Promise<JwtPayload | string>;
export async function verifyToken(
    token: string,
    context: TokenVerifyOptions,
) : Promise<JwtPayload | Jwt | string> {
    try {
        switch (context.type) {
            case KeyType.RSA:
            case KeyType.EC: {
                const { type, keyPair, ...options } = context;
                const { publicKey } = isKeyPair(keyPair) ?
                    keyPair :
                    await useKeyPair(keyPair);

                if (type === KeyType.RSA) {
                    options.algorithms = options.algorithms || ['RS256', 'RS384', 'RS512', 'PS256', 'PS384', 'PS512'];
                } else {
                    options.algorithms = options.algorithms || ['ES256', 'ES384', 'ES512'];
                }

                return verify(token, publicKey, {
                    ...options,
                });
            }
            case KeyType.OCT: {
                const { type, secret, ...options } = context;

                options.algorithms = options.algorithms || ['HS256', 'HS384', 'HS512'];

                return verify(token, secret, {
                    ...options,
                });
            }
        }
    } catch (e) {
        handleJWTError(e);

        throw e;
    }

    throw new TokenError({ message: 'Invalid type.' });
}
