/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '../user';
import type { PermissionRelation } from '../permission';
import type { Realm } from '../realm';

export interface UserPermission extends PermissionRelation {
    id: string;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;

    // ------------------------------------------------------------------

    userId: User['id'];

    user: User;

    userRealmId: Realm['id'] | null;

    userRealm: Realm | null;
}
