/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function boolableToObject<T extends Record<string, any>>(input: T | boolean) : T {
    if (typeof input === 'boolean') {
        return {} as T;
    }

    return input;
}
