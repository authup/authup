/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function toArray<T>(input?: T | T[]): T[] {
    if (!input) {
        return [];
    }

    return Array.isArray(input) ? input : [input];
}

export function toStringArray<T>(input?: T | T[]) : string[] {
    return toArray(input)
        .filter((el) => typeof el === 'string') as string[];
}

export function toArrayElement<T>(input?: T | T[]): T | undefined {
    return Array.isArray(input) ? input[0] : input;
}
