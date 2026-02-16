/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionProvisioningEntity } from '../permission/index.ts';
import type { RealmProvisioningEntity } from '../realm/index.ts';
import type { RoleProvisioningEntity } from '../role';
import type { ScopeProvisioningData } from '../scope';
import type { BaseProvisioningEntity } from '../types.ts';

export type RootProvisioningEntity = BaseProvisioningEntity & {
    /**
     * Create or update realms
     */
    realms?: RealmProvisioningEntity[],

    /**
     * Create or update global roles
     */
    roles?: RoleProvisioningEntity[],

    /**
     * Create or update global permissions
     */
    permissions?: PermissionProvisioningEntity[],

    /**
     * Create or update global scopes
     */
    scopes?: ScopeProvisioningData[],
};
