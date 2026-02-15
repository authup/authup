/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Role } from '@authup/core-kit';

export type RoleProvisioningRelations = {
    /**
     * Assign role to global permissions
     */
    globalPermissions?: string[],

    /**
     * Assign role to realm permissions.
     */
    realmPermissions?: string[],
};

export type RoleProvisioningData = {
    attributes: Partial<Role>,
    relations?: RoleProvisioningRelations
};
