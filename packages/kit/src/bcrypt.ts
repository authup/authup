/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

/**
 * Check if an input string might be a bcrypt hash.
 *
 * @see https://stackoverflow.com/questions/5393803/can-someone-explain-how-bcrypt-verifies-a-hash
 * @param input
 */
export function isBCryptHash(input: string): boolean {
    return [
        '$2a$',
        '$2x$',
        '$2y$',
        '$2b$',
    ].indexOf(input.substring(0, 4)) !== -1;
}
