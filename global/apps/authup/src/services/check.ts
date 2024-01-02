/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Key } from '@authup/config';
import { deserializeKey } from '@authup/config';

export function isServiceValid(input: Key | string) : boolean {
    let key : Key;
    if (typeof input === 'string') {
        key = deserializeKey(input);
    } else {
        key = input;
    }

    if (key.group !== 'client' && key.group !== 'server') {
        return false;
    }

    if (key.group === 'client') {
        return key.name === 'web';
    }

    return key.name === 'core';
}
