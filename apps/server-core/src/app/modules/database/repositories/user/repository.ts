/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm, User } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { applyQuery, isEntityUnique, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IRealmRepository, IUserRepository } from '../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../adapters/database/index.ts';
import type { UserRepository } from '../../../../../adapters/database/domains/index.ts';
import { UserEntity } from '../../../../../adapters/database/domains/index.ts';
import { translateWhereConditions } from '../helpers.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type UserRepositoryAdapterContext = {
    repository: UserRepository,
    realmRepository: Repository<Realm>,
};

export class UserRepositoryAdapter implements IUserRepository {
    private readonly repository: UserRepository;

    private readonly realmRepository: IRealmRepository;

    constructor(ctx: UserRepositoryAdapterContext) {
        this.repository = ctx.repository;
        this.realmRepository = new RealmRepositoryAdapter(ctx.realmRepository);
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<User>> {
        const qb = this.repository.createQueryBuilder('user');
        qb.groupBy('user.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'user',
            fields: {
                default: [
                    'id',
                    'name',
                    'name_locked',
                    'first_name',
                    'last_name',
                    'display_name',
                    'avatar',
                    'cover',
                    'active',
                    'created_at',
                    'updated_at',
                    'realm_id',
                ],
                allowed: ['email'],
            },
            filters: {
                allowed: ['id', 'name', 'realm_id'],
            },
            pagination: {
                maxLimit: 50,
            },
            relations: {
                allowed: ['realm'],
                onJoin: (_property: string, key: string, q: any) => {
                    q.addGroupBy(`${key}.id`);
                },
            },
            sort: {
                allowed: ['id', 'name', 'display_name', 'created_at', 'updated_at'],
            },
        });

        const [entities, total] = await qb.getManyAndCount();

        await this.repository.extendManyWithEA(entities);

        return {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        };
    }

    async findOneById(id: string): Promise<User | null> {
        const entity = await this.findOneBy({ id });
        if (entity) {
            await this.repository.extendOneWithEA(entity as UserEntity);
        }
        return entity;
    }

    async findOneByName(name: string, realmKey?: string): Promise<User | null> {
        const qb = this.repository.createQueryBuilder('user');
        qb.where('user.name LIKE :name', { name });

        if (realmKey) {
            const realm = await this.realmRepository.resolve(realmKey);
            if (realm) {
                qb.andWhere('user.realm_id = :realmId', { realmId: realm.id });
            }
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

    async findOne(id: string, query?: Record<string, any>, realmKey?: string): Promise<User | null> {
        const qb = this.repository.createQueryBuilder('user');

        if (isUUID(id)) {
            qb.where('user.id = :id', { id });
        } else {
            qb.where('user.name LIKE :name', { name: id });

            if (realmKey) {
                const realm = await this.realmRepository.resolve(realmKey);
                if (realm) {
                    qb.andWhere('user.realm_id = :realmId', { realmId: realm.id });
                }
            }
        }

        applyQuery(qb, query || {}, {
            defaultAlias: 'user',
            fields: {
                default: [
                    'id',
                    'name',
                    'name_locked',
                    'first_name',
                    'last_name',
                    'display_name',
                    'avatar',
                    'cover',
                    'active',
                    'created_at',
                    'updated_at',
                    'realm_id',
                ],
                allowed: ['email'],
            },
            relations: {
                allowed: ['realm'],
            },
        });

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
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<User>): User {
        return this.repository.create(data);
    }

    merge(entity: User, data: Partial<User>): User {
        return this.repository.merge(entity as UserEntity, data);
    }

    async save(entity: User): Promise<User> {
        return this.repository.save(entity as UserEntity);
    }

    async remove(entity: User): Promise<void> {
        await this.repository.remove(entity as UserEntity);
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
}
