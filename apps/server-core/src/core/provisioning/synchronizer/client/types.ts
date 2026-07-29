/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IClientPermissionRepository,
    IClientRepository,
    IClientRoleRepository,
    IClientScopeRepository,
    IPermissionRepository,
    IRoleRepository,
    IScopeRepository,
} from '../../../entities/index.ts';
import type { PermissionProvisioningEntity } from '../../entities/permission';
import type { RoleProvisioningEntity } from '../../entities/role';
import type { IProvisioningSynchronizer } from '../../types.ts';

export type ClientProvisioningSynchronizerContext = {
    clientRepository: IClientRepository,
    clientRoleRepository: IClientRoleRepository,
    clientPermissionRepository: IClientPermissionRepository,
    clientScopeRepository: IClientScopeRepository,

    roleRepository: IRoleRepository,
    permissionRepository: IPermissionRepository,
    scopeRepository: IScopeRepository,

    roleSynchronizer: IProvisioningSynchronizer<RoleProvisioningEntity>,
    permissionSynchronizer: IProvisioningSynchronizer<PermissionProvisioningEntity>,
};
