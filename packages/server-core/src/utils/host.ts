/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function toPublicHost(input: string) {
    if (input === '0.0.0.0' || input === '::') {
        return 'localhost';
    }

    return input;
}
