/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

type PartialRecordWithNull<T extends Record<string, any>> = {
    [K in keyof T]?: T[K] | null
};

/**
 * Assign properties from input to src.
 * 'null' values will be transformed to an empty string.
 *
 * @param src
 * @param input
 */
export function assignFormProperties<T extends Record<string, any>>(
    src: T,
    input: PartialRecordWithNull<T> = {},
) : T {
    const keys : (keyof T)[] = Object.keys(input);
    for (let i = 0; i < keys.length; i++) {
        const value = input[keys[i]];
        if (value === null) {
            src[keys[i]] = '' as T[keyof T];
        } else {
            src[keys[i]] = value as T[keyof T];
        }
    }

    return src;
}
