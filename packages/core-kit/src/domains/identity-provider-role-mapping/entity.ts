/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, IdentityProviderMappingRelation } from '../identity-provider';
import type { Role } from '../role';
import type { Realm } from '../realm';

export interface IdentityProviderRoleMapping extends IdentityProviderMappingRelation {
    id: string;

    name: string | null;

    value: string | null;

    value_is_regex: boolean;

    created_at: Date;

    updated_at: Date;

    // -----------------------------------------------

    role_id: string;

    role: Role;

    role_realm_id: Realm['id'] | null;

    role_realm: Realm | null;

    provider_id: IdentityProvider['id'];

    provider: IdentityProvider;

    provider_realm_id: Realm['id'] | null;

    provider_realm: Realm | null;
}
