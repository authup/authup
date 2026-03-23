/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role } from '@authup/core-kit';
import type { IdentityPolicyData, PermissionBinding } from '@authup/access';

export interface IIdentityPermissionProvider {
    getFor(identity: IdentityPolicyData): Promise<PermissionBinding[]>;
    isSuperset(parent: IdentityPolicyData, child: IdentityPolicyData): Promise<boolean>;
}

export interface IIdentityBindingRepository {
    getBoundPermissions(entity: string): Promise<PermissionBinding[]>;
    getBoundRoles(entity: string): Promise<Role[]>;
}

export interface IRoleBindingRepository {
    getBoundPermissions(entity: string | Role): Promise<PermissionBinding[]>;
    getBoundPermissionsForMany(entities: (string | Role)[]): Promise<PermissionBinding[]>;
}

export type IdentityPermissionProviderContext = {
    clientRepository: IIdentityBindingRepository;
    userRepository: IIdentityBindingRepository;
    robotRepository: IIdentityBindingRepository;
    roleRepository: IRoleBindingRepository;
};
