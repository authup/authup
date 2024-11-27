/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function template(
    str: string,
    data: Record<string, any>,
    regex = /\{\{(.+?)\}\}/g,
) : string {
    return Array.from(str.matchAll(regex))
        .reduce((
            acc,
            match,
        ) => {
            if (typeof data[match[1]] !== 'undefined') {
                return acc.replace(match[0], data[match[1]]);
            }

            return acc;
        }, str);
}
