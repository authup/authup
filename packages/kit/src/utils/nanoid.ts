/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { customAlphabet } from 'nanoid';

export function createNanoID(alphabet?: string) : string;
export function createNanoID(len?: number) : string;
export function createNanoID(alphabet?: string, len?: number) : string;
export function createNanoID(alphabetOrLen?: string | number, len?: number) : string {
    if (typeof alphabetOrLen === 'string') {
        return customAlphabet(alphabetOrLen, len || 21)();
    }

    if (typeof alphabetOrLen === 'number') {
        return customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', alphabetOrLen)();
    }

    return customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', len || 21)();
}
