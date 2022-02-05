/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function isValidUserName(name: string) : boolean {
    return /^[A-Za-z0-9-_]{3,36}$/.test(name);
}
