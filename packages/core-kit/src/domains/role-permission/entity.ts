/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionRelation } from '../permission';
import type { Role } from '../role';
import type { Realm } from '../realm';

export interface RolePermission extends PermissionRelation {
    id: string;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;

    // ------------------------------------------------------------------

    roleId: string;

    role: Role;

    roleRealmId: Realm['id'] | null;

    roleRealm: Realm | null;
}
