/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function nullifyEmptyObjectProperties<T extends Record<string, any>>(data: T) : T {
    // Operate on a shallow copy — the caller's object is never mutated.
    const output : T = { ...data };
    const keys : (keyof T)[] = Object.keys(output);

    for (const key of keys) {
        if (output[key] === '') {
            output[key] = null as T[keyof T];
        }
    }

    return output;
}
