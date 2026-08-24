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
     * The opaque credential a console browser presents in place of a bearer
     * token (plan 088). The secret half of the row: `id` is the public
     * identifier (published as `sid` in every id_token and on every
     * `/sessions` row), this is what a holder must prove.
     *
     * Null on every bearer-mode session. The column is `select: false`, so it
     * is ABSENT from every ordinary read and present only on the dedicated
     * lookup. That is why it is optional here rather than always a value.
     */
    secret?: string | null,

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
