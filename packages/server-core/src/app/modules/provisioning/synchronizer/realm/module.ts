/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import { pickRecord } from '@authup/kit';
import type { Repository } from 'typeorm';
import type { ClientProvisioningEntity, ScopeProvisioningEntity } from '../../entities/index.ts';
import type { PermissionProvisioningEntity } from '../../entities/permission/index.ts';
import type { RealmProvisioningEntity } from '../../entities/realm/index.ts';
import type { RobotProvisioningEntity } from '../../entities/robot/index.ts';
import type { RoleProvisioningEntity } from '../../entities/role/index.ts';
import type { UserProvisioningEntity } from '../../entities/user/index.ts';
import { ProvisioningEntityStrategyType, normalizeEntityProvisioningStrategy } from '../../strategy/index.ts';
import type {
    IProvisioningSynchronizer,

} from '../../types.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { RealmProvisioningSynchronizerContext } from './types.ts';

export class RealmProvisioningSynchronizer extends BaseProvisioningSynchronizer<RealmProvisioningEntity> {
    protected repository : Repository<Realm>;

    protected clientSynchronizer: IProvisioningSynchronizer<ClientProvisioningEntity>;

    protected permissionSynchronizer: IProvisioningSynchronizer<PermissionProvisioningEntity>;

    protected roleSynchronizer: IProvisioningSynchronizer<RoleProvisioningEntity>;

    protected userSynchronizer: IProvisioningSynchronizer<UserProvisioningEntity>;

    protected robotSynchronizer: IProvisioningSynchronizer<RobotProvisioningEntity>;

    protected scopeSynchronizer : IProvisioningSynchronizer<ScopeProvisioningEntity>;

    constructor(ctx: RealmProvisioningSynchronizerContext) {
        super();

        this.repository = ctx.repository;
        this.clientSynchronizer = ctx.clientSynchronizer;
        this.permissionSynchronizer = ctx.permissionSynchronizer;
        this.roleSynchronizer = ctx.roleSynchronizer;
        this.userSynchronizer = ctx.userSynchronizer;
        this.robotSynchronizer = ctx.robotSynchronizer;
        this.scopeSynchronizer = ctx.scopeSynchronizer;
    }

    async synchronize(input: RealmProvisioningEntity): Promise<RealmProvisioningEntity> {
        const strategy = normalizeEntityProvisioningStrategy(input.strategy);
        let attributes = await this.repository.findOneBy({
            name: input.attributes.name,
        });
        if (attributes) {
            switch (strategy.type) {
                case ProvisioningEntityStrategyType.MERGE:
                    attributes = this.repository.merge(
                        attributes,
                        strategy.attributes ?
                            pickRecord(input.attributes, strategy.attributes) :
                            input.attributes,
                    );

                    attributes = await this.repository.save(attributes);
                    break;
                case ProvisioningEntityStrategyType.REPLACE:
                    await this.repository.remove(attributes);
                    attributes = await this.repository.save(input.attributes);
                    break;
            }
        } else {
            attributes = await this.repository.save(input.attributes);
        }

        if (input.relations && input.relations.clients) {
            const clients = input.relations.clients.map(
                (child) => {
                    child.attributes.realm_id = attributes.id;
                    child.attributes.realm = attributes;
                    return child;
                },
            );

            await this.clientSynchronizer.synchronizeMany(clients);
        }

        if (input.relations && input.relations.permissions) {
            const permissions = input.relations.permissions.map((child) => {
                child.attributes.realm_id = attributes.id;
                child.attributes.realm = attributes;
                return child;
            });

            await this.permissionSynchronizer.synchronizeMany(permissions);
        }

        if (input.relations && input.relations.roles) {
            const roles = input.relations.roles.map((child) => {
                child.attributes.realm_id = attributes.id;
                child.attributes.realm = attributes;
                return child;
            });

            await this.roleSynchronizer.synchronizeMany(roles);
        }

        if (input.relations && input.relations.users) {
            const users = input.relations.users.map((child) => {
                child.attributes.realm_id = attributes.id;
                child.attributes.realm = attributes;
                return child;
            });

            await this.userSynchronizer.synchronizeMany(users);
        }

        if (input.relations && input.relations.robots) {
            const robots = input.relations.robots.map((child) => {
                child.attributes.realm_id = attributes.id;
                child.attributes.realm = attributes;
                return child;
            });

            await this.robotSynchronizer.synchronizeMany(robots);
        }

        if (input.relations && input.relations.scopes) {
            const scopes = input.relations.scopes.map((child) => {
                child.attributes.realm_id = attributes.id;
                child.attributes.realm = attributes;
                return child;
            });

            await this.scopeSynchronizer.synchronizeMany(scopes);
        }

        return {
            ...input,
            attributes,
        };
    }
}
