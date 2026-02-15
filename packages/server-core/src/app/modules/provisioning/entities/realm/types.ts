/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Realm } from '@authup/core-kit';
import type { ClientProvisioningContainer } from '../client';
import type { PermissionProvisioningContainer } from '../permission';
import type { RobotProvisioningContainer } from '../robot';
import type { RoleProvisioningContainer } from '../role';
import type { ScopeProvisioningContainer } from '../scope';
import type { UserProvisioningContainer } from '../user';

export type RealmProvisioningRelations = {
    users?: UserProvisioningContainer[],

    robots?: RobotProvisioningContainer[]

    clients?: ClientProvisioningContainer[]

    // Create Roles for Realm
    roles?: RoleProvisioningContainer[],

    scopes?: ScopeProvisioningContainer[],

    // Create Permissions for Realm
    permissions?: PermissionProvisioningContainer[],
};

export type RealmProvisioningContainer = {
    data: Partial<Realm>

    relations?: RealmProvisioningRelations
};
