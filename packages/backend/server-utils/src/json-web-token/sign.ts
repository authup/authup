/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { sign } from 'jsonwebtoken';
import { useKeyPair } from '../key-pair';
import { TokenSignOptions } from './type';

export async function signToken<T extends string | object | Buffer | Record<string, any>>(
    payload: T,
    context?: TokenSignOptions,
): Promise<string> {
    context ??= {};
    context.expiresIn = context.expiresIn || 3600;

    const { secret, keyPair: keyPairOptions, ...options } = context;

    if (secret) {
        options.algorithm = options.algorithm || 'HS256';
        return sign(payload, secret, options);
    }

    const keyPair = await useKeyPair(keyPairOptions);
    options.algorithm = options.algorithm || 'RS256';

    return sign(payload, keyPair.privateKey, options);
}
