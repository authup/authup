/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderBaseMapping } from '../identity-provider';
import type { Role } from '../role';
import type { Realm } from '../realm';

export interface IdentityProviderPermissionMapping extends IdentityProviderBaseMapping {
    id: string;

    createdAt: string;

    updatedAt: string;

    // -----------------------------------------------

    permissionId: string;

    permission: Role;

    permissionRealmId: Realm['id'] | null;

    permissionRealm: Realm | null;
}
