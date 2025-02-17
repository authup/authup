/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isNameValid } from '../../helpers';

export function isUserNameValid(input: string) : boolean {
    if (!isNameValid(input)) return false;

    input = input.toLowerCase();

    return ![
        'bot',
        'system',
        'everyone',
        'here',
    ].some((el) => input.startsWith(el));
}

export function isValidUserEmail(input: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}
