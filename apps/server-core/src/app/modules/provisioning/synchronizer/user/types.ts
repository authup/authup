/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client, Permission, Role, User, UserPermission,
    UserRole,
} from '@authup/core-kit';
import type { Repository } from 'typeorm';

export type UserProvisioningSynchronizerContext = {
    userRepository: Repository<User>,
    userRoleRepository: Repository<UserRole>,
    userPermissionRepository: Repository<UserPermission>,

    clientRepository: Repository<Client>,
    roleRepository: Repository<Role>,
    permissionRepository: Repository<Permission>
};
