/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from './has-own-property';

function isObject(item) : item is object {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

export function hasMinDepthOf(record: Record<string, any>, depth: number) {
    if (depth === 0) {
        return true;
    }

    const keys = Object.keys(record);
    for (let i = 0; i < keys.length; i++) {
        if (
            hasOwnProperty(record, keys[i]) &&
            typeof record[keys[i]] === 'object' &&
            hasMinDepthOf(record[keys[i]], depth - 1)
        ) {
            return true;
        }
    }

    return false;
}

/**
 * Deep merge two objects to a depth of 10.
 *
 * @param target
 * @param sources
 */
export function mergeDeep<A extends Record<string, any>, B extends Record<string, any>>(
    target: A,
    ...sources: B[]
) : A & B {
    if (!sources.length) return target as A & B;
    const source = sources.shift();

    if (
        isObject(target) &&
        isObject(source)
    ) {
        if (
            hasOwnProperty(source, '__proto__') ||
            hasOwnProperty(source, 'constructor')
        ) {
            return mergeDeep(target, ...sources);
        }

        const keys = Object.keys(source);
        for (let i = 0; i < keys.length; i++) {
            const key : string = keys[i];

            if (isObject(source[key])) {
                if (hasOwnProperty(target, key)) {
                    if (
                        !isObject(target[key]) ||
                        !hasMinDepthOf(target[key], 10) ||
                        !hasMinDepthOf(source[key], 10)
                    ) {
                        mergeDeep(target[key], source[key]);
                    }
                } else {
                    Object.assign(target, { [key]: {} });
                    mergeDeep(target[key], source[key]);
                }
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return mergeDeep(target, ...sources);
}
