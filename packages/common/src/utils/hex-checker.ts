/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function isHex(value: string) : boolean {
    return /^[A-Fa-f0-9]+$/i.test(value);
}
