/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { ClientProvisioningContainer } from '../../entities/client';
import type { PermissionProvisioningContainer } from '../../entities/permission';
import type { RobotProvisioningContainer } from '../../entities/robot';
import type { RoleProvisioningContainer } from '../../entities/role';
import type { UserProvisioningContainer } from '../../entities/user';
import type {
    IProvisioningSynchronizer,

} from '../../types.ts';

export type RealmProvisioningSynchronizerContext = {
    repository: Repository<Realm>,

    clientSynchronizer: IProvisioningSynchronizer<ClientProvisioningContainer>,
    roleSynchronizer: IProvisioningSynchronizer<RoleProvisioningContainer>,
    permissionSynchronizer: IProvisioningSynchronizer<PermissionProvisioningContainer>,
    userSynchronizer: IProvisioningSynchronizer<UserProvisioningContainer>,
    robotSynchronizer: IProvisioningSynchronizer<RobotProvisioningContainer>,
};
