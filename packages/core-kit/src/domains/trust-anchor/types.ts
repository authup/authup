/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '../realm';

export interface TrustAnchor {
    id: string,

    name: string,

    /**
     * PEM-encoded CA certificate or CA chain.
     */
    certificate: string,

    enabled: boolean,

    created_at: string,

    updated_at: string,

    realm_id: Realm['id'],

    realm: Realm,
}
