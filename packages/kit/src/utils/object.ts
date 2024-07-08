/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function isObject(input: unknown) : input is Record<string, any> {
    return !!input &&
        typeof input === 'object' &&
        !Array.isArray(input);
}

export function extendObject<T extends Record<string, any>>(
    target: T,
    source: Partial<T>,
) : T {
    const keys = Object.keys(source);
    for (let i = 0; i < keys.length; i++) {
        target[keys[i] as keyof T] = source[keys[i]] as T[keyof T];
    }

    return target;
}
