/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { base64ToArrayBuffer } from '@authup/kit';

/**
 * The optional key-encryption key, checked at boot rather than at first use.
 *
 * Unset means plaintext-at-rest, which is a supported posture; SET but
 * malformed is a misconfiguration that would otherwise surface the first time
 * a realm key is wrapped, long after the process reported itself healthy.
 */
export function assertSecretsEncryptionKey(value: string | undefined) : void {
    if (!value) {
        return;
    }

    let byteLength = -1;
    try {
        byteLength = base64ToArrayBuffer(value.trim()).byteLength;
    } catch {
        // fall through: treated as invalid below
    }

    if (byteLength !== 32) {
        throw new Error('secretsEncryptionKey must decode to exactly 32 bytes (base64).');
    }
}
