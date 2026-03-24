/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Role } from '@authup/core-kit';
import type { BaseProvisioningEntity } from '../types.ts';

export type RoleProvisioningRelations = {
    /**
     * Assign role to global permissions
     */
    globalPermissions?: string[],

    /**
     * Exclude these permission names from globalPermissions wildcard resolution.
     */
    globalPermissionsExclude?: string[],

    /**
     * Default policy name to set on each role-permission junction entry.
     */
    globalPermissionsPolicyName?: string,

    /**
     * Per-permission policy overrides. Maps policy name to permission names
     * that should use that policy instead of the default.
     */
    globalPermissionsPolicyOverrides?: Record<string, string[]>,

    /**
     * Assign role to realm permissions.
     */
    realmPermissions?: string[],
};

export type RoleProvisioningEntity = BaseProvisioningEntity<Role> & {
    attributes: Partial<Role>,
    relations?: RoleProvisioningRelations
};
