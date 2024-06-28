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
        target[keys[i] as keyof T] = source[keys[i]];
    }

    return target;
}

export function flattenObject(input: Record<string, any>) : Record<string, any> {
    const output : Record<string, any> = {};

    const keys = Object.keys(input);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = input[key];
        if (isObject(value)) {
            const childAttributes = flattenObject(value);
            const childAttributeKeys = Object.keys(childAttributes);
            for (let j = 0; j < childAttributeKeys.length; j++) {
                output[`${key}.${childAttributeKeys[j]}`] = childAttributes[childAttributeKeys[j]];
            }

            continue;
        }

        output[key] = input[key];
    }

    return output;
}
