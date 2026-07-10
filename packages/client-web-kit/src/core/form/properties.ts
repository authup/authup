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
 * Only keys already present in src are assigned — the form state owns its
 * shape. Copying every input key would leak unrelated entity properties
 * (id, timestamps, sibling sub-form fields, ...) into the form state and
 * from there into submit payloads, where a stale copy from one sub-form
 * can clobber an edited value from another.
 *
 * @param src
 * @param input
 */
export function assignFormProperties<T extends Record<string, any>>(
    src: T,
    input: PartialRecordWithNull<T> = {},
) : T {
    const keys : (keyof T)[] = Object.keys(src);
    for (const key of keys) {
        if (!Object.prototype.hasOwnProperty.call(input, key)) {
            continue;
        }

        const value = input[key];
        if (value === null) {
            src[key] = '' as T[keyof T];
        } else {
            src[key] = value as T[keyof T];
        }
    }

    return src;
}
