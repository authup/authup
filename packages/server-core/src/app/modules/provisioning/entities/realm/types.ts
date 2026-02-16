/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Realm } from '@authup/core-kit';
import type { ClientProvisioningEntity } from '../client/index.ts';
import type { PermissionProvisioningEntity } from '../permission';
import type { RobotProvisioningEntity } from '../robot';
import type { RoleProvisioningEntity } from '../role';
import type { ScopeProvisioningEntity } from '../scope';
import type { BaseProvisioningEntity } from '../types.ts';
import type { UserProvisioningEntity } from '../user';

export type RealmProvisioningRelations = {
    users?: UserProvisioningEntity[],

    robots?: RobotProvisioningEntity[]

    clients?: ClientProvisioningEntity[]

    // Create Roles for Realm
    roles?: RoleProvisioningEntity[],

    scopes?: ScopeProvisioningEntity[],

    // Create Permissions for Realm
    permissions?: PermissionProvisioningEntity[],
};

export type RealmProvisioningEntity = BaseProvisioningEntity<Realm> & {
    attributes: Partial<Realm>

    relations?: RealmProvisioningRelations
};
