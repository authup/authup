/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Client } from '@authup/core-kit';
import type { PermissionProvisioningContainer } from '../permission/index.ts';
import type { RoleProvisioningData } from '../role/index.ts';

export type ClientProvisioningRelations = {
    /**
     * Create or update permissions for client.
     */
    permissions?: PermissionProvisioningContainer[],

    /**
     * Assign client to realm permissions.
     */
    realmPermissions?: string[],

    /**
     * Assign client to global permissions.
     */
    globalPermissions?: string[],

    // ------------------------------------------

    /**
     * Create or update roles for client.
     */
    roles?: RoleProvisioningData[],

    /**
     * Assign client to roles of same realm.
     */
    realmRoles?: string[],

    /**
     * Assign client to global roles.
     */
    globalRoles?: string[],

};

export type ClientProvisioningData = {
    attributes: Partial<Client>,

    relations?: ClientProvisioningRelations
};
