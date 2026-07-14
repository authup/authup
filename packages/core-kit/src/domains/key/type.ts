/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWKType, JWKUse, JWTAlgorithm } from '@authup/specs';
import type { Realm } from '../realm';
import type { KeyStatus } from './constants';

export interface Key {
    id: string,

    name: string,

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
     * Lifecycle state (active / passive / disabled).
     */
    status: `${KeyStatus}`,

    /**
     * Optional X.509 certificate (PEM chain) — populated on import,
     * published as x5c/x5t in JWKS (Stage B of plan 071).
     */
    certificate?: string | null,

    /**
     * aka private key
     */
    decryption_key: string | null,

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
