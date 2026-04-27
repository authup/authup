/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPermissionRepository, IPolicyRepository, IRoleRepository } from '../../../entities/index.ts';
import type { IClientPermissionRepository } from '../../../entities/client-permission/types.ts';
import type { IPermissionPolicyRepository } from '../../../entities/permission-policy/types.ts';
import type { IRobotPermissionRepository } from '../../../entities/robot-permission/types.ts';
import type { IRolePermissionRepository } from '../../../entities/role-permission/types.ts';
import type { IScopeRepository } from '../../../entities/scope/types.ts';
import type { IUserPermissionRepository } from '../../../entities/user-permission/types.ts';

export type OrphanSweepSynchronizerContext = {
    policyRepository: IPolicyRepository;
    permissionRepository: IPermissionRepository;
    permissionPolicyRepository: IPermissionPolicyRepository;
    rolePermissionRepository?: IRolePermissionRepository;
    userPermissionRepository?: IUserPermissionRepository;
    clientPermissionRepository?: IClientPermissionRepository;
    robotPermissionRepository?: IRobotPermissionRepository;
    roleRepository: IRoleRepository;
    scopeRepository: IScopeRepository;
    defaultPolicyName?: string;
};

export type OrphanSweepResult = {
    policies: string[];
    permissions: string[];
    roles: string[];
    scopes: string[];
};
