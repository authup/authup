/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client';
import type { Realm } from '../realm';
import type { Scope } from '../scope';

export interface ClientScope {
    id: string;

    default: boolean;

    clientId: Client['id'];
    client: Client;

    clientRealmId: Realm['id'] | null;
    clientRealm: Realm | null;

    scopeId: Scope['id'];
    scope: Scope;

    scopeRealmId: Realm['id'] | null;
    scopeRealm: Realm | null;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;
}
