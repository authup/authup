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

    role_id: Role['id'];

    role: Role;

    role_realm_id: Realm['id'] | null;

    role_realm: Realm | null;

    user_id: User['id'];

    user: User;

    user_realm_id: Realm['id'] | null;

    user_realm: Realm | null;

    // ------------------------------------------------------------------

    created_at: string;

    updated_at: string;
}
