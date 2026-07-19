/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { RealmScope } from '@authup/access';
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
     * Default realmScope (own | ownOrNull | any) to stamp on each
     * role-permission junction entry. Realm reach is a coarse, actor-relative
     * enum on the junction (not a policy).
     */
    globalPermissionsRealmScope?: RealmScope,

    /**
     * Per-permission realmScope overrides. Maps a realmScope value to the
     * permission names that should use that scope instead of the default.
     */
    globalPermissionsRealmScopeOverrides?: Partial<Record<RealmScope, string[]>>,

    /**
     * Assign role to realm permissions.
     */
    realmPermissions?: string[],
};

export type RoleProvisioningEntity = BaseProvisioningEntity<Role> & {
    attributes: Partial<Role>,
    relations?: RoleProvisioningRelations
};
