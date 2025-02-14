/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionRelation } from '../permission';
import type { Client } from '../client';
import type { Realm } from '../realm';

export interface ClientPermission extends PermissionRelation {
    id: string;

    // ------------------------------------------------------------------

    created_at: Date;

    updated_at: Date;

    // ------------------------------------------------------------------

    client_id: string;

    client: Client;

    client_realm_id: Realm['id'] | null;

    client_realm: Realm | null;
}
