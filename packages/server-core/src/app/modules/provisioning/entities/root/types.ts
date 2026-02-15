/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionProvisioningContainer } from '../permission/index.ts';
import type { RealmProvisioningData } from '../realm/index.ts';
import type { RoleProvisioningData } from '../role';
import type { ScopeProvisioningData } from '../scope';

export type RootProvisioningData = {
    /**
     * Create or update realms
     */
    realms?: RealmProvisioningData[],

    /**
     * Create or update global roles
     */
    roles?: RoleProvisioningData[],

    /**
     * Create or update global permissions
     */
    permissions?: PermissionProvisioningContainer[],

    /**
     * Create or update global scopes
     */
    scopes?: ScopeProvisioningData[],
};
