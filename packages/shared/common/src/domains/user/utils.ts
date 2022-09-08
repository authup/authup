/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function isValidUserName(name: string) : boolean {
    if (/\s/g.test(name)) {
        return false;
    }

    return /^[A-Za-z0-9-_]{3,36}$/.test(name) &&
        name.toLowerCase().indexOf('bot') === -1 &&
        name.toLowerCase().indexOf('system') === -1 &&
        name.toLowerCase() !== 'everyone' &&
        name.toLowerCase() !== 'here';
}
