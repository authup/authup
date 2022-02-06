/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { customAlphabet } from 'nanoid';

export function createNanoID(alphabet?: string, len = 21) : string {
    if (alphabet) {
        return customAlphabet(alphabet, len)();
    }
    return customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', len)();
}
