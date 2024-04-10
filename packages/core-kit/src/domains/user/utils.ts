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

    return /^[A-Za-z0-9-_.]{3,36}$/.test(input) &&
        input.toLowerCase().indexOf('bot') === -1 &&
        input.toLowerCase().indexOf('system') === -1 &&
        input.toLowerCase() !== 'everyone' &&
        input.toLowerCase() !== 'here';
}

export function isValidUserEmail(input: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}
