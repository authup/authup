/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client, ClientPermission, ClientRole, Permission, Role,
} from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type {
    IProvisioningSynchronizer,
    PermissionProvisioningContainer,
    RoleProvisioningContainer,
} from '../../types.ts';

export type ClientProvisioningSynchronizerContext = {
    clientRepository: Repository<Client>,
    clientRoleRepository: Repository<ClientRole>,
    clientPermissionRepository: Repository<ClientPermission>,

    roleRepository: Repository<Role>,
    permissionRepository: Repository<Permission>,

    roleSynchronizer: IProvisioningSynchronizer<RoleProvisioningContainer>,
    permissionSynchronizer: IProvisioningSynchronizer<PermissionProvisioningContainer>
};
