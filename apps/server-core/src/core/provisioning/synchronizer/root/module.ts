/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    PolicyProvisioningEntity,
    RealmProvisioningEntity,
    RoleProvisioningEntity,
    RootProvisioningEntity,
    ScopeProvisioningEntity,
} from '../../entities/index.ts';
import type { PermissionProvisioningEntity } from '../../entities/permission/index.ts';
import type { IProvisioningSynchronizer, } from '../../types.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { RootProvisioningSynchronizerContext } from './types.ts';

export class GraphProvisioningSynchronizer extends BaseProvisioningSynchronizer<RootProvisioningEntity> {
    protected policySynchronizer: IProvisioningSynchronizer<PolicyProvisioningEntity>;

    protected realmSynchronizer: IProvisioningSynchronizer<RealmProvisioningEntity>;

    protected permissionSynchronizer : IProvisioningSynchronizer<PermissionProvisioningEntity>;

    protected roleSynchronizer: IProvisioningSynchronizer<RoleProvisioningEntity>;

    protected scopeSynchronizer: IProvisioningSynchronizer<ScopeProvisioningEntity>;

    constructor(ctx: RootProvisioningSynchronizerContext) {
        super();

        this.policySynchronizer = ctx.policySynchronizer;
        this.permissionSynchronizer = ctx.permissionSynchronizer;
        this.realmSynchronizer = ctx.realmSynchronizer;
        this.roleSynchronizer = ctx.roleSynchronizer;
        this.scopeSynchronizer = ctx.scopeSynchronizer;
    }

    async synchronize(input: RootProvisioningEntity): Promise<RootProvisioningEntity> {
        const output : RootProvisioningEntity = {};

        if (input.policies) {
            output.policies = await this.policySynchronizer.synchronizeMany(input.policies);
        }

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
