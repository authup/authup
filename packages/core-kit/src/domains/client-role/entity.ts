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

    client_id: string;

    role_id: string;

    // ------------------------------------------------------------------

    role: Role;

    role_realm_id: Realm['id'] | null;

    role_realm: Realm | null;

    client: Client;

    client_realm_id: Realm['id'] | null;

    client_realm: Realm | null;

    // ------------------------------------------------------------------

    created_at: string;

    updated_at: string;
}
