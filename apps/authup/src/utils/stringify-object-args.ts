/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function stringifyObjectArgs(ob: Record<string, any>) {
    const parts : string[] = [];

    const keys = Object.keys(ob);
    for (const key of keys) {
        parts.push(`--${key} ${ob[key]}`);
    }

    return parts.join(' ');
}
