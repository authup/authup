/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IPermissionRepository,
    IRobotPermissionRepository,
    IRobotRepository,
    IRobotRoleRepository,
    IRoleRepository,
} from '../../../entities/index.ts';

export type RobotProvisioningSynchronizerContext = {
    robotRepository: IRobotRepository,
    robotRoleRepository: IRobotRoleRepository,
    robotPermissionRepository: IRobotPermissionRepository,

    roleRepository: IRoleRepository,
    permissionRepository: IPermissionRepository,
};
