/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function extendObjectProperties<T extends Record<string, any>>(
    src: T,
    input?: Partial<T>,
) : T {
    if (!input) {
        return src;
    }

    const keys : (keyof T)[] = Object.keys(input);
    for (let i = 0; i < keys.length; i++) {
        src[keys[i]] = input[keys[i]] as T[keyof T];
    }

    return src;
}
