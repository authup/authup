/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role } from '../role';
import type { Client } from '../client';
import type { Realm } from '../realm';

export interface ClientRole {
    id: string;

    clientId: string;

    roleId: string;

    // ------------------------------------------------------------------

    role: Role;

    roleRealmId: Realm['id'] | null;

    roleRealm: Realm | null;

    client: Client;

    clientRealmId: Realm['id'] | null;

    clientRealm: Realm | null;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;
}
