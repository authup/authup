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

    permissionId: Permission['id'];
    permission: Permission;

    permissionRealmId: Realm['id'] | null;
    permissionRealm: Realm | null;

    // ------------------------------------------------------------------

    policyId: Policy['id'];
    policy: Policy;

    policyRealmId: Realm['id'] | null;
    policyRealm: Realm | null;

    // ------------------------------------------------------------------

    createdAt: string;
    updatedAt: string;
}
