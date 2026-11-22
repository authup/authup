/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '../realm/index.ts';
import type { Role } from '../role/index.ts';

export interface RoleAttribute {
    id: string;

    name: string;

    value: string | null;

    // ------------------------------------------------------------------

    roleId: Role['id'];

    role: Role;

    realmId: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;
}
