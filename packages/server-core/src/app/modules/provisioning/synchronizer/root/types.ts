/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ScopeProvisioningContainer } from '../../entities';
import type { PermissionProvisioningContainer } from '../../entities/permission';
import type { RealmProvisioningContainer } from '../../entities/realm';
import type { RoleProvisioningContainer } from '../../entities/role';
import type {
    IProvisioningSynchronizer,

} from '../../types.ts';

export type RootProvisioningSynchronizerContext = {
    permissionSynchronizer: IProvisioningSynchronizer<PermissionProvisioningContainer>,
    realmSynchronizer: IProvisioningSynchronizer<RealmProvisioningContainer>,
    roleSynchronizer: IProvisioningSynchronizer<RoleProvisioningContainer>,
    scopeSynchronizer: IProvisioningSynchronizer<ScopeProvisioningContainer>,
};
