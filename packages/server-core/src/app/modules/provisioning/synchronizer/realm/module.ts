/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type {
    ClientProvisioningContainer,
    IProvisioningSynchronizer,
    PermissionProvisioningContainer,
    RealmProvisioningContainer, RobotProvisioningContainer,
    RoleProvisioningContainer,
    UserProvisioningContainer,
} from '../../types.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { RealmProvisioningSynchronizerContext } from './types.ts';

export class RealmProvisioningSynchronizer extends BaseProvisioningSynchronizer<RealmProvisioningContainer> {
    protected repository : Repository<Realm>;

    protected clientSynchronizer: IProvisioningSynchronizer<ClientProvisioningContainer>;

    protected permissionSynchronizer: IProvisioningSynchronizer<PermissionProvisioningContainer>;

    protected roleSynchronizer: IProvisioningSynchronizer<RoleProvisioningContainer>;

    protected userSynchronizer: IProvisioningSynchronizer<UserProvisioningContainer>;

    protected robotSynchronizer: IProvisioningSynchronizer<RobotProvisioningContainer>;

    constructor(ctx: RealmProvisioningSynchronizerContext) {
        super();

        this.repository = ctx.repository;
        this.clientSynchronizer = ctx.clientSynchronizer;
        this.permissionSynchronizer = ctx.permissionSynchronizer;
        this.roleSynchronizer = ctx.roleSynchronizer;
        this.userSynchronizer = ctx.userSynchronizer;
        this.robotSynchronizer = ctx.robotSynchronizer;
    }

    async synchronize(input: RealmProvisioningContainer): Promise<RealmProvisioningContainer> {
        const data = await this.repository.save(input.data);

        if (input.meta && input.meta.clients) {
            const clients = input.meta.clients.map(
                (child) => {
                    child.data.realm_id = data.id;
                    child.data.realm = data;
                    return child;
                },
            );

            await this.clientSynchronizer.synchronizeMany(clients);
        }

        if (input.meta && input.meta.permissions) {
            const permissions = input.meta.permissions.map((child) => {
                child.data.realm_id = data.id;
                child.data.realm = data;
                return child;
            });

            await this.permissionSynchronizer.synchronizeMany(permissions);
        }

        if (input.meta && input.meta.roles) {
            const roles = input.meta.roles.map((child) => {
                child.data.realm_id = data.id;
                child.data.realm = data;
                return child;
            });

            await this.roleSynchronizer.synchronizeMany(roles);
        }

        if (input.meta && input.meta.users) {
            const users = input.meta.users.map((child) => {
                child.data.realm_id = data.id;
                child.data.realm = data;
                return child;
            });

            await this.userSynchronizer.synchronizeMany(users);
        }

        if (input.meta && input.meta.robots) {
            const robots = input.meta.robots.map((child) => {
                child.data.realm_id = data.id;
                child.data.realm = data;
                return child;
            });

            await this.robotSynchronizer.synchronizeMany(robots);
        }

        return {
            ...input,
            data,
        };
    }
}
