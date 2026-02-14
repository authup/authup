/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { ClientProvisioningContainer } from '../../entities/client';
import type { PermissionProvisioningContainer } from '../../entities/permission';
import type { RealmProvisioningContainer } from '../../entities/realm';
import type { RobotProvisioningContainer } from '../../entities/robot';
import type { RoleProvisioningContainer } from '../../entities/role';
import type { UserProvisioningContainer } from '../../entities/user';
import type {
    IProvisioningSynchronizer,

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
        let data = await this.repository.findOneBy({
            name: input.data.name,
        });
        if (!data) {
            data = await this.repository.save(input.data);
        }

        if (input.relations && input.relations.clients) {
            const clients = input.relations.clients.map(
                (child) => {
                    child.data.realm_id = data.id;
                    child.data.realm = data;
                    return child;
                },
            );

            await this.clientSynchronizer.synchronizeMany(clients);
        }

        if (input.relations && input.relations.permissions) {
            const permissions = input.relations.permissions.map((child) => {
                child.data.realm_id = data.id;
                child.data.realm = data;
                return child;
            });

            await this.permissionSynchronizer.synchronizeMany(permissions);
        }

        if (input.relations && input.relations.roles) {
            const roles = input.relations.roles.map((child) => {
                child.data.realm_id = data.id;
                child.data.realm = data;
                return child;
            });

            await this.roleSynchronizer.synchronizeMany(roles);
        }

        if (input.relations && input.relations.users) {
            const users = input.relations.users.map((child) => {
                child.data.realm_id = data.id;
                child.data.realm = data;
                return child;
            });

            await this.userSynchronizer.synchronizeMany(users);
        }

        if (input.relations && input.relations.robots) {
            const robots = input.relations.robots.map((child) => {
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
