/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function cleanDoubleSlashes(input = ''): string {
    if (input.indexOf('://') !== -1) {
        return input.split('://')
            .map((str) => cleanDoubleSlashes(str))
            .join('://');
    }

    return input.replace(/\/+/g, '/');
}
