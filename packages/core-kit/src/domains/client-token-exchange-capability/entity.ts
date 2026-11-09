/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client';
import type { Realm } from '../realm';
import type { ClientTokenExchangeRealmScope } from './constants';

export interface ClientTokenExchangeCapability {
    id: string;

    /**
     * Matched exactly against the `audience` of an exchange request.
     */
    audience: string;

    /**
     * Space-separated entries the client may delegate: `type` allows every
     * action of that type, `type:action` allows that one action.
     */
    value: string;

    /**
     * Ceiling for the lifetime of an issued token, in seconds.
     */
    maxAge: number;

    realmScope: `${ClientTokenExchangeRealmScope}`;

    // ------------------------------------------------------------------

    clientId: Client['id'];
    client: Client;

    realmId: Realm['id'];
    realm: Realm;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;
}
