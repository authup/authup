/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IPermissionRepository, 
    IPolicyRepository, 
    IRolePermissionRepository, 
    IRoleRepository,
} from '../../../entities/index.ts';

export type RoleProvisioningSynchronizerContext = {
    repository: IRoleRepository,
    permissionRepository: IPermissionRepository,
    rolePermissionRepository: IRolePermissionRepository,
    policyRepository?: IPolicyRepository,
};
