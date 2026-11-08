/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client';
import type { Realm } from '../realm';
import type { ClientTokenExchangeSubjectRealmScope } from './constants';

export interface ClientTokenExchangePolicy {
    id: string;

    /**
     * Matched exactly against the `audience` of an exchange request.
     */
    audience: string;

    /**
     * Space-separated capability type segments the client may delegate.
     */
    capabilityTypes: string;

    /**
     * Ceiling for the lifetime of an issued token, in seconds.
     */
    maxLifetime: number;

    subjectRealmScope: `${ClientTokenExchangeSubjectRealmScope}`;

    // ------------------------------------------------------------------

    clientId: Client['id'];
    client: Client;

    realmId: Realm['id'];
    realm: Realm;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;
}
