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
            const key = match[1];
            if (
                key &&
                Object.prototype.hasOwnProperty.call(data, key) &&
                typeof data[key] !== 'undefined'
            ) {
                return acc.replace(match[0], data[key]);
            }

            return acc;
        }, str);
}
