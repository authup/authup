/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function stringifyObjectArgs(ob: Record<string, any>) {
    const parts : string[] = [];

    const keys = Object.keys(ob);
    for (let i = 0; i < keys.length; i++) {
        parts.push(`--${keys[i]} ${ob[keys[i]]}`);
    }

    return parts.join(' ');
}
