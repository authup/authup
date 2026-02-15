/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Realm } from '@authup/core-kit';
import type { ClientProvisioningData } from '../client/index.ts';
import type { PermissionProvisioningContainer } from '../permission';
import type { RobotProvisioningData } from '../robot';
import type { RoleProvisioningData } from '../role';
import type { ScopeProvisioningData } from '../scope';
import type { UserProvisioningData } from '../user';

export type RealmProvisioningRelations = {
    users?: UserProvisioningData[],

    robots?: RobotProvisioningData[]

    clients?: ClientProvisioningData[]

    // Create Roles for Realm
    roles?: RoleProvisioningData[],

    scopes?: ScopeProvisioningData[],

    // Create Permissions for Realm
    permissions?: PermissionProvisioningContainer[],
};

export type RealmProvisioningData = {
    attributes: Partial<Realm>

    relations?: RealmProvisioningRelations
};
