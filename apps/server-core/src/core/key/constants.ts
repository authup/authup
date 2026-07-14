/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Version tag leading a realm-cipher blob (v1.&lt;key_id&gt;.&lt;payload&gt;).
 */
export const REALM_CIPHER_BLOB_VERSION = 'v1';

/**
 * Marker prefixing key material stored KEK-wrapped in the key store
 * (config secretsEncryptionKey). Unprefixed material is plaintext.
 */
export const WRAPPED_KEY_MATERIAL_PREFIX = 'wrapped.v1.';
