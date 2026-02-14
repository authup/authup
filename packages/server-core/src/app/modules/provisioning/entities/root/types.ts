/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionProvisioningContainer } from '../permission';
import type { RealmProvisioningContainer } from '../realm';
import type { RoleProvisioningContainer } from '../role';
import type { ScopeProvisioningContainer } from '../scope';

export type RootProvisioningData = {
    /**
     * Create or update realms
     */
    realms?: RealmProvisioningContainer[],

    /**
     * Create or update global roles
     */
    roles?: RoleProvisioningContainer[],

    /**
     * Create or update global permissions
     */
    permissions?: PermissionProvisioningContainer[],

    /**
     * Create or update global scopes
     */
    scopes?: ScopeProvisioningContainer[],
};
