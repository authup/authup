/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function isValidUserName(input: string) : boolean {
    if (/\s/g.test(input)) {
        return false;
    }

    if (!(/^[A-Za-z0-9-_.]{3,36}$/.test(input))) {
        return false;
    }

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
