/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Reversible symmetric encryption for secrets that must be recoverable
 * at rest (e.g. TOTP seeds — unlike passwords, they cannot be one-way
 * hashed because verification needs the plaintext).
 */
export interface ISymmetricCipher {
    encrypt(plain: string): Promise<string>;

    decrypt(blob: string): Promise<string>;
}
