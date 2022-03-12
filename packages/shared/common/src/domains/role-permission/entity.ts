/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Permission, PermissionRelation } from '../permission';
import { Role } from '../role';

export interface RolePermission extends PermissionRelation {
    id: string;

    // ------------------------------------------------------------------

    created_at: Date;

    updated_at: Date;

    // ------------------------------------------------------------------

    role_id: string;

    role: Role;
}
