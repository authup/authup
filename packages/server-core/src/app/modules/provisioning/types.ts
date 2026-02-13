/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client, Permission, Realm, Robot, Role, Scope, User,
} from '@authup/core-kit';
import type { ObjectLiteral } from '@authup/kit';

export type ProvisioningContainer<A, R> = {
    data: A,
    relations?: R
};

// todo: add top level scopes

export type ScopeProvisioningContainer = ProvisioningContainer<Partial<Scope>, ObjectLiteral>;

export type PermissionProvisioningContainer = ProvisioningContainer<
Partial<Permission>,
ObjectLiteral
>;

export type RobotProvisioningRelations = {
    /**
     * Assign robot to realm permissions.
     */
    realmPermissions?: string[],

    /**
     * Assign robot to global permissions.
     */
    globalPermissions?: string[],

    // ------------------------------------------

    /**
     * Assign robot to roles of the same realm.
     */
    realmRoles?: string[]

    /**
     * Assign robot to global roles
     */
    globalRoles?: string[],
};
export type RobotProvisioningContainer = ProvisioningContainer<Partial<Robot>, RobotProvisioningRelations>;

export type UserProvisioningRelations = {
    /**
     * Assign user to specific client permissions of the same realm.
     */
    clientPermissions?: Record<string, string[]>,

    /**
     * Assign user to realm permissions.
     */
    realmPermissions?: string[],

    /**
     * Assign user to global permissions.
     */
    globalPermissions?: string[],

    // ------------------------------------------

    /**
     * Assign user to specific client roles of the same realm.
     */
    clientRoles?: Record<string, string[]>,

    /**
     * Assign user to roles of the same realm.
     */
    realmRoles?: string[]

    /**
     * Assign user to global roles
     */
    globalRoles?: string[],
};
export type UserProvisioningContainer = ProvisioningContainer<Partial<User>, UserProvisioningRelations>;

export type RoleProvisioningRelations = {
    /**
     * Assign role to global permissions
     */
    globalPermissions?: string[],
};
export type RoleProvisioningContainer = ProvisioningContainer<
Partial<Role>,
RoleProvisioningRelations
>;

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
    roles?: RoleProvisioningContainer[],

    /**
     * Assign client to roles of same realm.
     */
    realmRoles?: string[],

    /**
     * Assign client to global roles.
     */
    globalRoles?: string[],

};
export type ClientProvisioningContainer = ProvisioningContainer<
Partial<Client>,
ClientProvisioningRelations
>;

export type RealmProvisioningRelations = {
    users?: UserProvisioningContainer[],

    robots?: RobotProvisioningContainer[]

    clients?: ClientProvisioningContainer[]

    // Create Roles for Realm
    roles?: RoleProvisioningContainer[],

    // Create Permissions for Realm
    permissions?: PermissionProvisioningContainer[],
};
export type RealmProvisioningContainer = ProvisioningContainer<
Partial<Realm>,
RealmProvisioningRelations
>;

export type ProvisioningData = {
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

export interface IProvisioningSource {
    load() : Promise<ProvisioningData>;
}

export interface IProvisioningSynchronizer<T> {
    synchronize(input: T) : Promise<T>;
    synchronizeMany(input: T[]) : Promise<T[]>;
}
