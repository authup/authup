/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWKType, JWKUse, JWTAlgorithm } from '@authup/specs';
import type { Realm } from '../realm';

export interface Key {
    id: string,

    /**
     * OCT, RSA or EC
     */
    type: `${JWKType}`,

    /**
     * Intended usage (RFC 7517 §4.2): sig (token signing/verification)
     * or enc (at-rest data encryption).
     */
    use: `${JWKUse}`,

    /**
     * Algorithm for signing and verifying. Null for enc keys.
     */
    signature_algorithm: `${JWTAlgorithm}` | null

    /**
     * Usage priority.
     */
    priority: number,

    /**
     * aka private key
     */
    decryption_key?: string | null,

    /**
     * aka public key
     */
    encryption_key: string | null,

    // ------------------------------------------------------------------

    created_at: string,

    updated_at: string,

    // ------------------------------------------------------------------

    realm_id: Realm['id'],

    realm: Realm
}
