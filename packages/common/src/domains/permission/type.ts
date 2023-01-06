/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Realm } from '../realm';
import { Permission } from './entity';

export interface PermissionRelation {
    power: number;

    condition: string | null;

    fields: string | null;

    negation: boolean;

    target: string | null;

    // ------------------------------------------------------------------

    permission_id: Permission['id'];

    permission: Permission;

    permission_realm_id: Realm['id'] | null;

    permission_realm: Realm | null;
}
