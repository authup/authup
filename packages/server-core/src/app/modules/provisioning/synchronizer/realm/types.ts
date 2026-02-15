/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { ScopeProvisioningData } from '../../entities/index.ts';
import type { ClientProvisioningData } from '../../entities/client/index.ts';
import type { PermissionProvisioningContainer } from '../../entities/permission/index.ts';
import type { RobotProvisioningData } from '../../entities/robot/index.ts';
import type { RoleProvisioningData } from '../../entities/role/index.ts';
import type { UserProvisioningData } from '../../entities/user/index.ts';
import type {
    IProvisioningSynchronizer,

} from '../../types.ts';

export type RealmProvisioningSynchronizerContext = {
    repository: Repository<Realm>,

    clientSynchronizer: IProvisioningSynchronizer<ClientProvisioningData>,
    roleSynchronizer: IProvisioningSynchronizer<RoleProvisioningData>,
    permissionSynchronizer: IProvisioningSynchronizer<PermissionProvisioningContainer>,
    userSynchronizer: IProvisioningSynchronizer<UserProvisioningData>,
    robotSynchronizer: IProvisioningSynchronizer<RobotProvisioningData>,
    scopeSynchronizer: IProvisioningSynchronizer<ScopeProvisioningData>,
};
