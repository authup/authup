/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { pickRecord } from '@authup/kit';
import type { IRealmRepository } from '../../../entities/index.ts';
import type { ClientProvisioningEntity, ScopeProvisioningEntity } from '../../entities/index.ts';
import type { PathProvisioningEntity } from '../../entities/path/index.ts';
import type { PermissionProvisioningEntity } from '../../entities/permission/index.ts';
import type { RealmProvisioningEntity } from '../../entities/realm/index.ts';
import type { RoleProvisioningEntity } from '../../entities/role/index.ts';
import type { UserProvisioningEntity } from '../../entities/user/index.ts';
import { ProvisioningEntityStrategyType, normalizeEntityProvisioningStrategy } from '../../strategy/index.ts';
import type { IProvisioningSynchronizer, ProvisioningSynchronizeContext } from '../../types.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { RealmProvisioningSynchronizerContext } from './types.ts';

export class RealmProvisioningSynchronizer extends BaseProvisioningSynchronizer<RealmProvisioningEntity> {
    protected repository : IRealmRepository;

    protected clientSynchronizer: IProvisioningSynchronizer<ClientProvisioningEntity>;

    protected permissionSynchronizer: IProvisioningSynchronizer<PermissionProvisioningEntity>;

    protected roleSynchronizer: IProvisioningSynchronizer<RoleProvisioningEntity>;

    protected userSynchronizer: IProvisioningSynchronizer<UserProvisioningEntity>;

    protected scopeSynchronizer : IProvisioningSynchronizer<ScopeProvisioningEntity>;

    protected pathSynchronizer : IProvisioningSynchronizer<PathProvisioningEntity>;

    constructor(ctx: RealmProvisioningSynchronizerContext) {
        super();

        this.repository = ctx.repository;
        this.clientSynchronizer = ctx.clientSynchronizer;
        this.permissionSynchronizer = ctx.permissionSynchronizer;
        this.roleSynchronizer = ctx.roleSynchronizer;
        this.userSynchronizer = ctx.userSynchronizer;
        this.scopeSynchronizer = ctx.scopeSynchronizer;
        this.pathSynchronizer = ctx.pathSynchronizer;
    }

    async synchronize(input: RealmProvisioningEntity): Promise<RealmProvisioningEntity> {
        this.canonicalizeName(input.attributes);

        const strategy = normalizeEntityProvisioningStrategy(input.strategy);
        let attributes = await this.repository.findOneBy({ name: input.attributes.name });

        if (strategy.type === ProvisioningEntityStrategyType.ABSENT) {
            if (attributes) {
                await this.repository.remove(attributes);
            }

            return {
                ...input,
                attributes: attributes || input.attributes,
            };
        }

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
                    input.attributes.id = attributes.id;
                    attributes = await this.repository.save(this.repository.create(input.attributes));

                    break;
            }
        } else {
            attributes = await this.repository.save(this.repository.create(input.attributes));
        }

        // Entities first, relations after: a relation between two entities
        // of the realm (a client granted a realm permission, a role bound to
        // a permission another client owns) binds only once both exist,
        // whatever order the file declares them in (#3854).
        const deferred: Array<() => Promise<void>> = [];
        const context: ProvisioningSynchronizeContext = {
            defer: (task) => {
                deferred.push(task);
            },
        };

        // Scopes first: they are leaf entities carrying no relations of their
        // own, and a client below may bind them through `realmScopes`.
        if (input.relations && input.relations.scopes) {
            const scopes = input.relations.scopes.map((child) => {
                child.attributes.realmId = attributes.id;
                child.attributes.realm = attributes;

                return child;
            });

            await this.scopeSynchronizer.synchronizeMany(scopes);
        }

        // Folders next: both the clients and the users below may be filed
        // under one through `relations.path`, and an entry declared here is
        // what gives such a folder a display name or a description.
        if (input.relations && input.relations.paths) {
            const paths = input.relations.paths.map((child) => {
                child.attributes.realmId = attributes.id;

                return child;
            });

            await this.pathSynchronizer.synchronizeMany(paths);
        }

        if (input.relations && input.relations.permissions) {
            const permissions = input.relations.permissions.map((child) => {
                child.attributes.realmId = attributes.id;
                child.attributes.realm = attributes;

                return child;
            });

            await this.permissionSynchronizer.synchronizeMany(permissions, context);
        }

        if (input.relations && input.relations.roles) {
            const roles = input.relations.roles.map((child) => {
                child.attributes.realmId = attributes.id;
                child.attributes.realm = attributes;

                return child;
            });

            await this.roleSynchronizer.synchronizeMany(roles, context);
        }

        if (input.relations && input.relations.clients) {
            const clients = input.relations.clients.map(
                (child) => {
                    child.attributes.realmId = attributes.id;
                    child.attributes.realm = attributes;

                    return child;
                },
            );

            await this.clientSynchronizer.synchronizeMany(clients, context);
        }

        if (input.relations && input.relations.users) {
            const users = input.relations.users.map((child) => {
                child.attributes.realmId = attributes.id;
                child.attributes.realm = attributes;

                return child;
            });

            await this.userSynchronizer.synchronizeMany(users, context);
        }

        // Every binding runs even when one fails: a createOnly entity created
        // on this pass is never bound on a later one, so a binding skipped
        // now would stay missing for good. The first failure fails the pass.
        const errors: unknown[] = [];

        for (const task of deferred) {
            try {
                await task();
            } catch (e) {
                errors.push(e);
            }
        }

        if (errors.length > 0) {
            throw errors[0];
        }

        return {
            ...input,
            attributes,
        };
    }
}
