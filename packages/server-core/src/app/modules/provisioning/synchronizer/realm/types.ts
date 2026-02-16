/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { ScopeProvisioningData } from '../../entities/index.ts';
import type { ClientProvisioningEntity } from '../../entities/client/index.ts';
import type { PermissionProvisioningEntity } from '../../entities/permission/index.ts';
import type { RobotProvisioningEntity } from '../../entities/robot/index.ts';
import type { RoleProvisioningEntity } from '../../entities/role/index.ts';
import type { UserProvisioningData } from '../../entities/user/index.ts';
import type {
    IProvisioningSynchronizer,

} from '../../types.ts';

export type RealmProvisioningSynchronizerContext = {
    repository: Repository<Realm>,

    clientSynchronizer: IProvisioningSynchronizer<ClientProvisioningEntity>,
    roleSynchronizer: IProvisioningSynchronizer<RoleProvisioningEntity>,
    permissionSynchronizer: IProvisioningSynchronizer<PermissionProvisioningEntity>,
    userSynchronizer: IProvisioningSynchronizer<UserProvisioningData>,
    robotSynchronizer: IProvisioningSynchronizer<RobotProvisioningEntity>,
    scopeSynchronizer: IProvisioningSynchronizer<ScopeProvisioningData>,
};
