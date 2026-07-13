/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client';
import type { Realm } from '../realm';

export interface Consent {
    /**
     * Public ID
     */
    id: string;

    /**
     * Subject ID
     */
    sub: string,

    /**
     * Subject kind (e.g. user, robot, client)
     */
    sub_kind: string,

    /**
     * One lowercase OAuth2 scope token.
     */
    scope: string,

    // ------------------------------------------------------------------

    /**
     * Expiration date (iso). Null = does not expire.
     */
    expires_at: string | null,

    /**
     * Last update date (iso).
     */
    updated_at: string,

    /**
     * Creation date (iso).
     */
    created_at: string,

    // ------------------------------------------------------------------

    client_id: Client['id'];

    client: Client;

    realm_id: Realm['id'];

    realm: Realm;
}
