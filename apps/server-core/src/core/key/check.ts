/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { matchesInstanceof } from '@authup/errors';
import { REALM_CIPHER_BLOB_ERROR_INSTANCE, type RealmCipherBlobError } from './error.ts';

export function isRealmCipherBlobError(input: unknown): input is RealmCipherBlobError {
    return matchesInstanceof(input, REALM_CIPHER_BLOB_ERROR_INSTANCE);
}
