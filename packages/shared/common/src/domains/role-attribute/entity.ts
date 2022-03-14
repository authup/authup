/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Realm } from '../realm';
import { Role } from '../role';

export interface RoleAttribute {
    id: string;

    key: string;

    value: string | null;

    // ------------------------------------------------------------------

    role_id: Role['id'];

    role: Role;

    realm_id: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    created_at: string;

    updated_at: string;
}
