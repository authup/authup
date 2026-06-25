/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy } from '@authup/core-kit';
import type {
    IdentityPolicyData,
    PermissionPolicyBinding,
    RealmScopeValue,
} from '@authup/access';
import type { IClientRepository } from '../../entities/client/types.ts';
import type { IRobotRepository } from '../../entities/robot/types.ts';
import type { IRoleRepository } from '../../entities/role/types.ts';
import type { IUserRepository } from '../../entities/user/types.ts';
import type { IIdentityRoleProvider } from '../role/types.ts';

export type ResolveJunctionPolicyOptions = {
    name: string;
    realmId?: string | null;
    clientId?: string | null;
};

/**
 * The actor's own grant for a permission: the policy to inherit (if any) and the
 * realm_scope ceiling the actor is allowed to propagate (a creator may not grant
 * a broader scope than it holds).
 */
export type ResolveJunctionGrantResult = {
    policy?: Policy;
    realmScope: RealmScopeValue;
};

export interface IIdentityPermissionProvider {
    getFor(identity: IdentityPolicyData): Promise<PermissionPolicyBinding[]>;
    isSuperset(parent: IdentityPolicyData, child: IdentityPolicyData): Promise<boolean>;
    resolveJunctionGrant(identity: IdentityPolicyData, options: ResolveJunctionPolicyOptions): Promise<ResolveJunctionGrantResult>;
}

export type IdentityPermissionProviderContext = {
    clientRepository: IClientRepository;
    userRepository: IUserRepository;
    robotRepository: IRobotRepository;
    roleRepository: IRoleRepository;
    roleProvider: IIdentityRoleProvider;
};
