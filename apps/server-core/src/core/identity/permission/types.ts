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

export interface IIdentityPermissionProvider {
    getFor(identity: IdentityPolicyData): Promise<PermissionPolicyBinding[]>;
    isSuperset(parent: IdentityPolicyData, child: IdentityPolicyData): Promise<boolean>;
    resolveJunctionPolicy(identity: IdentityPolicyData, options: ResolveJunctionPolicyOptions): Promise<Policy | undefined>;
}

export type IdentityPermissionProviderContext = {
    clientRepository: IClientRepository;
    userRepository: IUserRepository;
    robotRepository: IRobotRepository;
    roleRepository: IRoleRepository;
    roleProvider: IIdentityRoleProvider;
};
