/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderMappingRelation } from '../identity-provider';
import type { Role } from '../role';
import type { Realm } from '../realm';

export interface IdentityProviderPermissionMapping extends IdentityProviderMappingRelation {
    id: string;

    key: string | null;

    value: string | null;

    value_is_regex: boolean;

    created_at: Date;

    updated_at: Date;

    // -----------------------------------------------

    permission_id: string;

    permission: Role;

    permission_realm_id: Realm['id'] | null;

    permission_realm: Realm | null;
}
