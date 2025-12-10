/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client';
import type { Policy } from '../policy';
import type { Realm } from '../realm';

export interface PermissionRelation {
    policy_id: Policy['id'] | null;

    policy: Policy | null;

    permission_id: Permission['id'];

    permission: Permission;

    permission_realm_id: Realm['id'] | null;

    permission_realm: Realm | null;
}

export interface Permission {
    id: string;

    built_in: boolean;

    name: string;

    display_name: string | null;

    description: string | null;

    // ------------------------------------------------------------------

    policy_id: Policy['id'] | null;

    policy: Policy | null;

    // ------------------------------------------------------------------

    client_id: Client['id'] | null;

    client: Client | null;

    // ------------------------------------------------------------------

    realm_id: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    created_at: string;

    updated_at: string;
}
