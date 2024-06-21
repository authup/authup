/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { distinctArray } from 'smob';

export function buildValidatorParameterErrorMessage<
    T extends Record<string, any> = Record<string, any>,
>(name: keyof T | (keyof T)[]) {
    const names = distinctArray(Array.isArray(name) ? name : [name]);

    if (names.length > 1) {
        return `The parameters ${names.join(', ')} are invalid.`;
    }
    return `The parameter ${String(names[0])} is invalid.`;
}
