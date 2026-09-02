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
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { validateEntityJoinColumns } from 'typeorm-extension';
import { applyQuery, redactFieldConditions } from '../query.ts';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type { IRealmRepository, IUserRepository } from '../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../adapters/database/index.ts';
import { isDatabaseTypeRowLockable } from '../../../../../adapters/database/helpers/index.ts';
import {
    CachePrefix,
    RealmEntity,
    UserEntity,
    UserPermissionEntity,
    UserRepository,
    UserRoleEntity,
} from '../../../../../adapters/database/domains/index.ts';
import { applyRealmScopeSelect, isEntityUnique, translateWhereConditions } from '../helpers.ts';
import { loadBoundPermissions } from '../bindings.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type UserRepositoryAdapterContext = {
    repository: UserRepository,
    realmRepository: Repository<Realm>,
};

export type UserRepositoryAdapterOptions = {
    lockRows?: boolean,
};

export class UserRepositoryAdapter implements IUserRepository {
    private readonly repository: UserRepository;

    private readonly realmRepository: IRealmRepository;

    private readonly lockRows: boolean;

    constructor(ctx: UserRepositoryAdapterContext, options: UserRepositoryAdapterOptions = {}) {
        this.repository = ctx.repository;
        this.realmRepository = new RealmRepositoryAdapter(ctx.realmRepository);
        this.lockRows = options.lockRows ?? false;
    }

    async findMany(query: IQuery): Promise<EntityRepositoryFindManyResult<User>> {
        const qb = this.repository.createQueryBuilder('user');
        qb.groupBy('user.id');

        const { pagination } = applyQuery(qb, query);

        applyRealmScopeSelect(qb, 'user', ['id']);

        const [entities, total] = await qb.getManyAndCount();

        await this.repository.extendManyWithEA(entities);

        return {
            data: redactFieldConditions(query, entities),
            meta: {
                total,
                ...pagination,
            },
        };
    }

    async findOneById(id: string): Promise<User | null> {
        const entity = await this.findOneBy({ id });
        if (entity) {
            await this.repository.extendOneWithEA(entity);
        }
        return entity;
    }

    async findOneByName(name: string, realmKey?: string): Promise<User | null> {
        const qb = this.repository.createQueryBuilder('user');
        qb.where('user.name = :name', { name });

        if (realmKey) {
            const realmId = await this.realmRepository.resolveId(realmKey);
            if (!realmId) {
                return null;
            }
            qb.andWhere('user.realmId = :realmId', { realmId });
        }

        const entity = await qb.getOne();
        if (entity) {
            await this.repository.extendOneWithEA(entity);
        }
        return entity;
    }

    async findOneByIdOrName(idOrName: string, realm?: string): Promise<User | null> {
        return isUUID(idOrName) ?
            this.findOneById(idOrName) :
            this.findOneByName(idOrName, realm);
    }

    async findOne(id: string, query?: IQuery, realmKey?: string): Promise<User | null> {
        const qb = this.repository.createQueryBuilder('user');

        if (isUUID(id)) {
            qb.where('user.id = :id', { id });
        } else {
            qb.where('user.name = :name', { name: id });

            if (realmKey) {
                const realmId = await this.realmRepository.resolveId(realmKey);
                if (!realmId) {
                    return null;
                }
                qb.andWhere('user.realmId = :realmId', { realmId });
            }
        }

        applyQuery(qb, query);

        const entity = await qb.getOne();
        if (entity) {
            await this.repository.extendOneWithEA(entity);
        }
        return entity;
    }

    async findManyBy(where: Record<string, any>): Promise<User[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<User | null> {
        return this.repository.findOne({
            where: translateWhereConditions(where),
            ...(this.lockRows ? { lock: { mode: 'pessimistic_write' } } : {}),
        });
    }

    async findOneByWithEmail(where: Record<string, any>): Promise<User | null> {
        const qb = this.repository.createQueryBuilder('user');
        qb.addSelect('user.email');

        const translated = translateWhereConditions(where);
        qb.where(translated);

        return qb.getOne();
    }

    create(data: Partial<User>): User {
        return this.repository.create(data);
    }

    merge(entity: User, data: Partial<User>): User {
        return this.repository.merge(entity, data);
    }

    async save(entity: User): Promise<User> {
        return this.repository.save(entity);
    }

    async remove(entity: User): Promise<void> {
        await this.repository.remove(entity);
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

    async validateJoinColumns(data: Partial<User>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: UserEntity,
        });
    }

    async checkUniqueness(data: Partial<User>, existing?: User): Promise<void> {
        const isUnique = await isEntityUnique({
            dataSource: this.repository.manager.connection,
            entityTarget: UserEntity,
            entity: data,
            entityExisting: existing,
        });

        if (!isUnique) {
            throw new DatabaseConflictError();
        }
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
