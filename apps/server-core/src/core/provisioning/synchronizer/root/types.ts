/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyProvisioningEntity } from '../../entities/policy/index.ts';
import type { ScopeProvisioningEntity } from '../../entities/scope/index.ts';
import type { PermissionProvisioningEntity } from '../../entities/permission/index.ts';
import type { RealmProvisioningEntity } from '../../entities/realm/index.ts';
import type { RoleProvisioningEntity } from '../../entities/role/index.ts';
import type {
    IProvisioningSynchronizer,

} from '../../types.ts';

export type RootProvisioningSynchronizerContext = {
    policySynchronizer: IProvisioningSynchronizer<PolicyProvisioningEntity>,
    permissionSynchronizer: IProvisioningSynchronizer<PermissionProvisioningEntity>,
    realmSynchronizer: IProvisioningSynchronizer<RealmProvisioningEntity>,
    roleSynchronizer: IProvisioningSynchronizer<RoleProvisioningEntity>,
    scopeSynchronizer: IProvisioningSynchronizer<ScopeProvisioningEntity>,
};
