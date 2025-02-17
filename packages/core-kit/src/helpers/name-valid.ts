/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function isNameValid(input: string): boolean {
    if (/\s/g.test(input)) {
        return false;
    }

    return /^[A-Za-z0-9-_.]{3,36}$/.test(input);
}
