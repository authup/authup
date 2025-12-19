/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from './types';

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

export function removeObjectProperty<T extends ObjectLiteral>(input: Partial<T>, key: keyof T) {
    delete input[key];
}

export function omitObjectProperties<
    T extends ObjectLiteral,
>(input: Record<string, any>, excludeKeys: (keyof T)[]): T {
    const output : T = {} as T;
    const keys = Object.keys(input);

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (excludeKeys.indexOf(key) !== -1) {
            continue;
        }

        output[key as keyof T] = input[key] as T[keyof T];
    }

    return output;
}
