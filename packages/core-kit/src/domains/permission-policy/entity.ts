/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission } from '../permission';
import type { Policy } from '../policy';
import type { Realm } from '../realm';

export interface PermissionPolicy {
    id: string;

    // ------------------------------------------------------------------

    permission_id: Permission['id'];
    permission: Permission;

    permission_realm_id: Realm['id'] | null;
    permission_realm: Realm | null;

    // ------------------------------------------------------------------

    policy_id: Policy['id'];
    policy: Policy;

    policy_realm_id: Realm['id'] | null;
    policy_realm: Realm | null;

    // ------------------------------------------------------------------

    created_at: string;
    updated_at: string;
}
