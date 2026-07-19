/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client';
import type { Realm } from '../realm';
import type { User } from '../user';
import type { SessionAuthMethod } from './constants';

export interface Session {
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
     * Last used ip address.
     */
    ipAddress: string,

    /**
     * Last used user agent.
     */
    userAgent: string,

    // ------------------------------------------------------------------

    /**
     * Expiration date (iso)
     */
    expiresAt: string,

    /**
     * Time session was renewed.
     */
    refreshedAt: string | null,

    /**
     * Last time subject was seen.
     */
    seenAt: string | null,

    /**
     * Time the subject last passed a second-factor (MFA) challenge for
     * this session (iso). Null when no challenge was performed.
     */
    mfaAt: string | null,

    /**
     * How the subject authenticated (see SessionAuthMethod).
     * Null for sessions created before the column existed.
     */
    authMethod: `${SessionAuthMethod}` | null,

    /**
     * Last time new access-token, refresh-token created for session.
     */
    updatedAt: string,

    /**
     * Creation date of session
     */
    createdAt: string,

    // ------------------------------------------------------------------

    clientId: Client['id'] | null;

    client: Client | null;

    userId: User['id'] | null,

    user: User | null,

    realmId: Realm['id'];

    realm: Realm;
}
