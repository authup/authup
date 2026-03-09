/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Permission, Role, RolePermission,
} from '@authup/core-kit';
import type { Repository } from 'typeorm';

export type RoleProvisioningSynchronizerContext = {
    repository: Repository<Role>,
    permissionRepository: Repository<Permission>,
    rolePermissionRepository: Repository<RolePermission>
};
