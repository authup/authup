/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IProvisioningSynchronizer, PermissionProvisioningContainer,
    ProvisioningData,
    RealmProvisioningContainer,
    RoleProvisioningContainer, ScopeProvisioningContainer,
} from '../../types.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { RootProvisioningSynchronizerContext } from './types.ts';

export class GraphProvisioningSynchronizer extends BaseProvisioningSynchronizer<ProvisioningData> {
    protected realmSynchronizer: IProvisioningSynchronizer<RealmProvisioningContainer>;

    protected permissionSynchronizer : IProvisioningSynchronizer<PermissionProvisioningContainer>;

    protected roleSynchronizer: IProvisioningSynchronizer<RoleProvisioningContainer>;

    protected scopeSynchronizer: IProvisioningSynchronizer<ScopeProvisioningContainer>;

    constructor(ctx: RootProvisioningSynchronizerContext) {
        super();

        this.permissionSynchronizer = ctx.permissionSynchronizer;
        this.realmSynchronizer = ctx.realmSynchronizer;
        this.roleSynchronizer = ctx.roleSynchronizer;
        this.scopeSynchronizer = ctx.scopeSynchronizer;
    }

    async synchronize(input: ProvisioningData): Promise<ProvisioningData> {
        if (input.permissions) {
            await this.permissionSynchronizer.synchronizeMany(input.permissions);
        }

        if (input.roles) {
            await this.roleSynchronizer.synchronizeMany(input.roles);
        }

        if (input.scopes) {
            await this.scopeSynchronizer.synchronizeMany(input.scopes);
        }

        if (input.realms) {
            await this.realmSynchronizer.synchronizeMany(input.realms);
        }

        return input;
    }
}
