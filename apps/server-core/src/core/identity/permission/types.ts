/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission, Role } from '@authup/core-kit';
import type { IdentityPolicyData } from '@authup/access';

export interface IIdentityPermissionProvider {
    getFor(identity: IdentityPolicyData): Promise<Permission[]>;
    isSuperset(parent: IdentityPolicyData, child: IdentityPolicyData): Promise<boolean>;
}

export interface IIdentityBindingRepository {
    getBoundPermissions(entity: string): Promise<Permission[]>;
    getBoundRoles(entity: string): Promise<Role[]>;
}

export interface IRoleBindingRepository {
    getBoundPermissions(entity: string | Role): Promise<Permission[]>;
    getBoundPermissionsForMany(entities: (string | Role)[]): Promise<Permission[]>;
}

export type IdentityPermissionProviderContext = {
    clientRepository: IIdentityBindingRepository;
    userRepository: IIdentityBindingRepository;
    robotRepository: IIdentityBindingRepository;
    roleRepository: IRoleBindingRepository;
};
