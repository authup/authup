/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IClientRepository,
    IPermissionRepository,
    IRoleRepository,
    IUserPermissionRepository,
    IUserRepository,
    IUserRoleRepository,
} from '../../../entities/index.ts';

export type UserProvisioningSynchronizerContext = {
    userRepository: IUserRepository,
    userRoleRepository: IUserRoleRepository,
    userPermissionRepository: IUserPermissionRepository,

    clientRepository: IClientRepository,
    roleRepository: IRoleRepository,
    permissionRepository: IPermissionRepository,
};
