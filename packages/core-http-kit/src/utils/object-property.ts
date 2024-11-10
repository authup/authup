/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isPropertySet } from '@authup/kit';

export function nullifyEmptyObjectProperties<T extends Record<string, any>>(data: T) : T {
    const keys : (keyof T)[] = Object.keys(data);

    for (let i = 0; i < keys.length; i++) {
        if (data[keys[i]] === '') {
            data[keys[i]] = null as T[keyof T];
        }
    }

    return data;
}

export function deleteUndefinedObjectProperties<T extends Record<string, any>>(data: T) : T {
    const keys : string[] = Object.keys(data);

    for (let i = 0; i < keys.length; i++) {
        if (typeof data[keys[i]] === 'undefined') {
            delete data[keys[i]];
        }
    }

    return data;
}

export function extractObjectProperty<T extends Record<string, any>, K extends keyof T>(
    data: T | undefined,
    key: K,
) : T[K] | undefined {
    if (!data) {
        return undefined;
    }

    if (isPropertySet(data, key)) {
        return data[key];
    }

    return undefined;
}
