/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWKType, JWTAlgorithm } from '@authup/schema';
import type { Realm } from '../realm';

export interface Key {
    id: string,

    /**
     * OCT, RSA or EC
     */
    type: `${JWKType}`,

    /**
     * Algorithm for signing and verifying
     */
    signature_algorithm: `${JWTAlgorithm}`

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

    created_at: Date | string,

    updated_at: Date | string,

    // ------------------------------------------------------------------

    realm_id: Realm['id'],

    realm: Realm
}
