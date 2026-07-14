/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError, markInstanceof } from '@authup/errors';

export const REALM_CIPHER_BLOB_ERROR_INSTANCE = Symbol.for('@authup/server-core/RealmCipherBlobError');

/**
 * A blob-semantics decryption failure — malformed blob, unknown / foreign /
 * non-enc key reference, or failed GCM authentication. This is the expected
 * fail-closed class consumers map to a plain verification failure.
 * Infrastructure errors (database outage, KEK misconfiguration) are
 * deliberately NOT of this type — they must bubble instead of silently
 * burning a verification attempt.
 */
export class RealmCipherBlobError extends AuthupError {
    constructor(message: string) {
        super({ message });
        markInstanceof(this, REALM_CIPHER_BLOB_ERROR_INSTANCE);
    }
}
