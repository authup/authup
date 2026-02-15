/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    RealmProvisioningData,
    RoleProvisioningData,
    RootProvisioningData,
    ScopeProvisioningData,
} from '../../entities/index.ts';
import type { PermissionProvisioningContainer } from '../../entities/permission';
import type {
    IProvisioningSynchronizer,

} from '../../types.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { RootProvisioningSynchronizerContext } from './types.ts';

export class GraphProvisioningSynchronizer extends BaseProvisioningSynchronizer<RootProvisioningData> {
    protected realmSynchronizer: IProvisioningSynchronizer<RealmProvisioningData>;

    protected permissionSynchronizer : IProvisioningSynchronizer<PermissionProvisioningContainer>;

    protected roleSynchronizer: IProvisioningSynchronizer<RoleProvisioningData>;

    protected scopeSynchronizer: IProvisioningSynchronizer<ScopeProvisioningData>;

    constructor(ctx: RootProvisioningSynchronizerContext) {
        super();

        this.permissionSynchronizer = ctx.permissionSynchronizer;
        this.realmSynchronizer = ctx.realmSynchronizer;
        this.roleSynchronizer = ctx.roleSynchronizer;
        this.scopeSynchronizer = ctx.scopeSynchronizer;
    }

    async synchronize(input: RootProvisioningData): Promise<RootProvisioningData> {
        const output : RootProvisioningData = {};

        if (input.permissions) {
            output.permissions = await this.permissionSynchronizer.synchronizeMany(input.permissions);
        }

        if (input.roles) {
            output.roles = await this.roleSynchronizer.synchronizeMany(input.roles);
        }

        if (input.scopes) {
            output.scopes = await this.scopeSynchronizer.synchronizeMany(input.scopes);
        }

        if (input.realms) {
            output.realms = await this.realmSynchronizer.synchronizeMany(input.realms);
        }

        return output;
    }
}
