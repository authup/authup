/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role } from '../role';
import type { User } from '../user';
import type { Realm } from '../realm';

export interface UserRole {
    id: string;

    // ------------------------------------------------------------------

    roleId: Role['id'];

    role: Role;

    roleRealmId: Realm['id'] | null;

    roleRealm: Realm | null;

    userId: User['id'];

    user: User;

    userRealmId: Realm['id'] | null;

    userRealm: Realm | null;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;
}
