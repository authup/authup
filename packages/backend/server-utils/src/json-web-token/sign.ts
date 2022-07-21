/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { sign } from 'jsonwebtoken';
import { KeyPair, useKeyPair } from '../key-pair';
import { TokenSignOptions } from './type';

export async function signToken<T extends string | object | Buffer | Record<string, any>>(
    payload: T,
    options?: TokenSignOptions,
): Promise<string> {
    options ??= {};
    options.expiresIn = options.expiresIn || 3600;

    if (options.secret) {
        options.algorithm = options.algorithm || 'HS256';
        return sign(payload, options.secret, options);
    }

    const keyPair: KeyPair = await useKeyPair(options.keyPair);
    options.algorithm = options.algorithm || 'RS256';

    return sign(payload, keyPair.privateKey, options);
}
