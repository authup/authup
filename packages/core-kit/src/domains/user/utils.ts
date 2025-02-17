/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import type { NameValidOptions } from '../../helpers';
import { isNameValid } from '../../helpers';

export function isUserNameValid(input: string, options: NameValidOptions = {}) : boolean {
    if (!isNameValid(input, options)) return false;

    input = input.toLowerCase();

    const isReservedName = [
        'bot',
        'system',
        'everyone',
        'here',
    ].some((el) => input.startsWith(el));

    if (isReservedName) {
        if (options.throwOnFailure) {
            throw new AuthupError(`${input} is a reserved name.`);
        }

        return false;
    }

    return true;
}

export function isValidUserEmail(input: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}
