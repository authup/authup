/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { sign, verify } from 'jsonwebtoken';
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

export async function verifyToken<T extends string | object | Buffer | Record<string, any>>(
    token: string,
    keyPairOptions?: Partial<KeyPairOptions>,
) : Promise<T> {
    const keyPair : SecurityKeyPair = await useKeyPair(keyPairOptions);

    return await verify(token, keyPair.publicKey, {
        algorithms: ['RS256'],
    }) as T;
}
