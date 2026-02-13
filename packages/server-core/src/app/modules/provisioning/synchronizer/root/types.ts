/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IProvisioningSynchronizer,
    PermissionProvisioningContainer,
    RealmProvisioningContainer,
    RoleProvisioningContainer, ScopeProvisioningContainer,
} from '../../types.ts';

export type RootProvisioningSynchronizerContext = {
    permissionSynchronizer: IProvisioningSynchronizer<PermissionProvisioningContainer>,
    realmSynchronizer: IProvisioningSynchronizer<RealmProvisioningContainer>,
    roleSynchronizer: IProvisioningSynchronizer<RoleProvisioningContainer>,
    scopeSynchronizer: IProvisioningSynchronizer<ScopeProvisioningContainer>,
};
