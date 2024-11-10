/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import type { KeyPair } from '../type';

export function isKeyPair(data: unknown) : data is KeyPair {
    return isObject(data) &&
        typeof (data as KeyPair).privateKey !== 'undefined' &&
        typeof (data as KeyPair).publicKey !== 'undefined';
}

export function isKeyPairWithPublicKey(data: unknown) : data is Omit<KeyPair, 'privateKey'> {
    return isObject(data) &&
        typeof (data as KeyPair).publicKey !== 'undefined';
}
