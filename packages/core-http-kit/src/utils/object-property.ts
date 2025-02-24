/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function nullifyEmptyObjectProperties<T extends Record<string, any>>(data: T) : T {
    const keys : (keyof T)[] = Object.keys(data);

    for (let i = 0; i < keys.length; i++) {
        if (data[keys[i]] === '') {
            data[keys[i]] = null as T[keyof T];
        }
    }

    return data;
}
