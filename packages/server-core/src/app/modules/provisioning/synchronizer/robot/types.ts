/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client, Permission, Robot, RobotPermission, RobotRole,
    Role,
} from '@authup/core-kit';
import type { Repository } from 'typeorm';

export type RobotProvisioningSynchronizerContext = {
    robotRepository: Repository<Robot>,
    robotRoleRepository: Repository<RobotRole>,
    robotPermissionRepository: Repository<RobotPermission>,

    clientRepository: Repository<Client>,
    roleRepository: Repository<Role>,
    permissionRepository: Repository<Permission>
};
