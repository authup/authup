/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client';
import type { Realm } from '../realm';
import type { User } from '../user';

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
     * Subject kind (e.g. user, client)
     */
    subKind: string,

    /**
     * One lowercase OAuth2 scope token.
     */
    scope: string,

    // ------------------------------------------------------------------

    /**
     * Expiration date (iso). Null = does not expire.
     */
    expiresAt: string | null,

    /**
     * Last update date (iso).
     */
    updatedAt: string,

    /**
     * Creation date (iso).
     */
    createdAt: string,

    // ------------------------------------------------------------------

    clientId: Client['id'];

    client: Client;

    realmId: Realm['id'];

    realm: Realm;

    /**
     * Owning user, set only when the subject is a user (subKind = user), so a
     * user deletion cascade-drops its consent rows. Null for non-user subjects.
     */
    userId: User['id'] | null;

    user?: User | null;
}
