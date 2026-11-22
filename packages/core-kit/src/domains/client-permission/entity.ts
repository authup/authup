/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionRelation } from '../permission/index.ts';
import type { Client } from '../client/index.ts';
import type { Realm } from '../realm/index.ts';

export interface ClientPermission extends PermissionRelation {
    id: string;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;

    // ------------------------------------------------------------------

    clientId: string;

    client: Client;

    clientRealmId: Realm['id'] | null;

    clientRealm: Realm | null;
}
