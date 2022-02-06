/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deep merge two objects.
 * @param target
 * @param sources
 */
export function mergeDeep<A extends Record<string, any>, B extends Record<string, any>>(target: A, ...sources: B[]) : A & B {
    if (!sources.length) return target as A & B;
    const source = sources.shift();

    if (
        isObject(target) &&
        isObject(source)
    ) {
        const keys = Object.keys(source);
        for (let i = 0; i < keys.length; i++) {
            const key : string = keys[i];

            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return mergeDeep(target, ...sources);
}
