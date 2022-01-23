/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { sign, verify } from 'jsonwebtoken';
import { TokenError, hasOwnProperty } from '@typescript-auth/domains';
import { KeyPairOptions, SecurityKeyPair, useKeyPair } from '../key-pair';

export async function signToken<T extends string | object | Buffer | Record<string, any>>(
    payload: T,
    maxAge?: number,
    keyPairOptions?: Partial<KeyPairOptions>,
) : Promise<string> {
    const keyPair : SecurityKeyPair = await useKeyPair(keyPairOptions);

    return sign(payload, keyPair.privateKey, {
        expiresIn: maxAge ?? 3600,
        algorithm: 'RS256',
    });
}

/**
 * Verify and decrypt JWT.
 *
 * @param token
 * @param keyPairOptions
 *
 * @throws TokenError
 */
export async function verifyToken<T extends string | object | Buffer | Record<string, any>>(
    token: string,
    keyPairOptions?: Partial<KeyPairOptions>,
) : Promise<T> {
    const keyPair : SecurityKeyPair = await useKeyPair(keyPairOptions);

    try {
        return await verify(token, keyPair.publicKey, {
            algorithms: ['RS256'],
        }) as T;
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
                    throw TokenError.jwtInvalid(e.message);
            }
        }

        throw new TokenError({
            previous: e,
            decorateMessage: true,
            logMessage: true,
        });
    }
}
