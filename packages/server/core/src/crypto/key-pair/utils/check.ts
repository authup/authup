/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@authup/core';
import type { KeyPair } from '../type';

export function isKeyPair(data: unknown) : data is KeyPair {
    return typeof data === 'object' &&
        data !== null &&
        hasOwnProperty(data, 'privateKey') &&
        hasOwnProperty(data, 'publicKey');
}
