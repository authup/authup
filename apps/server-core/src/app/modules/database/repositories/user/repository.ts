/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm, Role, User } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { PermissionPolicyBinding } from '@authup/access';
import { buildRedisKeyPath } from '@authup/server-kit';
import type { Repository } from 'typeorm';
import type { IUserRepository } from '../../../../../core/index.ts';
import { isDatabaseTypeRowLockable } from '../../../../../adapters/database/helpers/index.ts';
import {
    CachePrefix,
    RealmEntity,
    UserEntity,
    UserPermissionEntity,
    UserRepository,
    UserRoleEntity,
} from '../../../../../adapters/database/domains/index.ts';
import { translateWhereConditions } from '../helpers.ts';
import { loadBoundPermissions } from '../bindings.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type UserRepositoryAdapterContext = {
    repository: UserRepository,
    realmRepository: Repository<Realm>,
};

export type UserRepositoryAdapterOptions = {
    lockRows?: boolean,
};

export class UserRepositoryAdapter extends EntityRepositoryAdapter<User, UserRepository> implements IUserRepository {
    constructor(ctx: UserRepositoryAdapterContext, options: UserRepositoryAdapterOptions = {}) {
        super(ctx.repository, {
            alias: 'user',
            target: UserEntity,
            entity: 'user',
            // `id` for the self short-circuit of the per-row gate
            realmScope: { extraColumns: ['id'] },
            realmRepository: new RealmRepositoryAdapter(ctx.realmRepository),
            lockRows: options.lockRows,
        });
    }

    protected override async extendOne(entity: User): Promise<void> {
        await this.repository.extendOneWithEA(entity);
    }

    protected override async extendMany(entities: User[]): Promise<void> {
        await this.repository.extendManyWithEA(entities);
    }

    async findOne(id: string, query?: IQuery, realmKey?: string): Promise<User | null> {
        return this.findOneWithQuery(id, query, realmKey);
    }




    async findOneByWithEmail(where: Record<string, any>): Promise<User | null> {
        const qb = this.repository.createQueryBuilder('user');
        qb.addSelect('user.email');

        const translated = translateWhereConditions(where);
        qb.where(translated);

        return qb.getOne();
    }

    async transaction<R>(fn: (repository: IUserRepository) => Promise<R>): Promise<R> {
        const dataSource = this.repository.manager.connection;
        if (!isDatabaseTypeRowLockable(dataSource.options.type)) {
            // better-sqlite3: no FOR UPDATE, and the driver shares ONE query
            // runner, so a transaction here would nest as a savepoint inside
            // whatever else is running on it. Plain unlocked passthrough,
            // exactly as the un-guarded path did (the removeGuarded rule).
            return fn(this);
        }

        // mysql / postgres: real concurrency. Hand the callback an adapter
        // bound to the transaction's manager whose single-row reads lock,
        // so the row loaded by save() cannot change under the merge.
        return dataSource.transaction((manager) => fn(new UserRepositoryAdapter({
            repository: new UserRepository(manager),
            realmRepository: manager.getRepository(RealmEntity),
        }, { lockRows: true })));
    }

    async getBoundRoles(entity: string | User): Promise<Role[]> {
        const id = typeof entity === 'string' ? entity : entity.id;
        const entries = await this.repository.manager
            .getRepository(UserRoleEntity)
            .find({
                where: { userId: id },
                relations: { role: true },
                cache: {
                    id: buildRedisKeyPath({
                        prefix: CachePrefix.USER_OWNED_ROLES,
                        key: id,
                    }),
                    milliseconds: 60_000,
                },
            });

        return entries.map((entry) => entry.role);
    }

    async getBoundPermissions(entity: string | User): Promise<PermissionPolicyBinding[]> {
        const id = typeof entity === 'string' ? entity : entity.id;
        return loadBoundPermissions({
            manager: this.repository.manager,
            junctionTarget: UserPermissionEntity,
            where: { userId: id },
            cachePrefix: CachePrefix.USER_OWNED_PERMISSIONS,
            cacheKey: id,
        });
    }
}
