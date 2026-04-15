/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy, Role } from '@authup/core-kit';
import type {
    IdentityPolicyData,
    PermissionPolicyBinding,
} from '@authup/access';

export type ResolveJunctionPolicyOptions = {
    name: string;
    realmId?: string | null;
    clientId?: string | null;
};

export interface IIdentityPermissionProvider {
    getFor(identity: IdentityPolicyData): Promise<PermissionPolicyBinding[]>;
    isSuperset(parent: IdentityPolicyData, child: IdentityPolicyData): Promise<boolean>;
    resolveJunctionPolicy(identity: IdentityPolicyData, options: ResolveJunctionPolicyOptions): Promise<Policy | undefined>;
}

export interface IIdentityBindingRepository {
    getBoundPermissions(entity: string): Promise<PermissionPolicyBinding[]>;
    getBoundRoles(entity: string): Promise<Role[]>;
}

export interface IRoleBindingRepository {
    getBoundPermissions(entity: string | Role): Promise<PermissionPolicyBinding[]>;
    getBoundPermissionsForMany(entities: (string | Role)[]): Promise<PermissionPolicyBinding[]>;
}

export type IdentityPermissionProviderContext = {
    clientRepository: IIdentityBindingRepository;
    userRepository: IIdentityBindingRepository;
    robotRepository: IIdentityBindingRepository;
    roleRepository: IRoleBindingRepository;
};
