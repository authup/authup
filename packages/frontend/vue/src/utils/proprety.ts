/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function initPropertiesFromSource<T extends Record<string, any>>(
    source: T,
    destination: Partial<T>,
) {
    const keys = Object.keys(destination);
    for (let i = 0; i < keys.length; i++) {
        if (Object.prototype.hasOwnProperty.call(source, keys[i])) {
            const key : keyof T = keys[i];
            destination[key] = source[keys[i]];
        }
    }
}
