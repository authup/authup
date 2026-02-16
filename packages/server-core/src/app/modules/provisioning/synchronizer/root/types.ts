/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ScopeProvisioningEntity } from '../../entities';
import type { PermissionProvisioningEntity } from '../../entities/permission';
import type { RealmProvisioningEntity } from '../../entities/realm';
import type { RoleProvisioningEntity } from '../../entities/role';
import type {
    IProvisioningSynchronizer,

} from '../../types.ts';

export type RootProvisioningSynchronizerContext = {
    permissionSynchronizer: IProvisioningSynchronizer<PermissionProvisioningEntity>,
    realmSynchronizer: IProvisioningSynchronizer<RealmProvisioningEntity>,
    roleSynchronizer: IProvisioningSynchronizer<RoleProvisioningEntity>,
    scopeSynchronizer: IProvisioningSynchronizer<ScopeProvisioningEntity>,
};
