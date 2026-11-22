/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role } from '../role/index.ts';
import type { Client } from '../client/index.ts';
import type { Realm } from '../realm/index.ts';

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
