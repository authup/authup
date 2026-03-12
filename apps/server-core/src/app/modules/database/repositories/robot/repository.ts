/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm, Robot } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { applyQuery, isEntityUnique, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IRealmRepository, IRobotRepository } from '../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../adapters/database/index.ts';
import { RobotEntity } from '../../../../../adapters/database/domains/index.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type RobotRepositoryAdapterContext = {
    repository: Repository<Robot>,
    realmRepository: Repository<Realm>,
};

export class RobotRepositoryAdapter implements IRobotRepository {
    private readonly repository: Repository<Robot>;

    private readonly realmRepository: IRealmRepository;

    constructor(ctx: RobotRepositoryAdapterContext) {
        this.repository = ctx.repository;
        this.realmRepository = new RealmRepositoryAdapter(ctx.realmRepository);
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<Robot>> {
        const qb = this.repository.createQueryBuilder('robot');
        qb.groupBy('robot.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'robot',
            fields: {
                allowed: [
                    'secret',
                ],
                default: [
                    'id',
                    'name',
                    'display_name',
                    'description',
                    'active',
                    'user_id',
                    'realm_id',
                    'created_at',
                    'updated_at',
                ],
            },
            filters: {
                allowed: ['id', 'name', 'realm_id', 'user_id'],
            },
            pagination: {
                maxLimit: 50,
            },
            relations: {
                // @ts-expect-error onJoin is not in the type definition
                allowed: ['realm', 'user'],
                onJoin: (_property: string, key: string, q: any) => {
                    q.addGroupBy(`${key}.id`);
                },
            },
            sort: {
                allowed: ['id', 'realm_id', 'user_id', 'updated_at', 'created_at'],
            },
        });

        const [entities, total] = await qb.getManyAndCount();

        return {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        };
    }

    findOneById(id: string): Promise<Robot | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(name: string, realmKey?: string): Promise<Robot | null> {
        const qb = this.repository.createQueryBuilder('robot');
        qb.where('robot.name LIKE :name', { name });

        if (realmKey) {
            const realm = await this.realmRepository.resolve(realmKey);
            if (realm) {
                qb.andWhere('robot.realm_id = :realmId', { realmId: realm.id });
            }
        }

        return qb.getOne();
    }

    async findOneByIdOrName(idOrName: string, realm?: string): Promise<Robot | null> {
        return isUUID(idOrName) ?
            this.findOneById(idOrName) :
            this.findOneByName(idOrName, realm);
    }

    async findOneBy(where: Record<string, any>): Promise<Robot | null> {
        return this.repository.findOneBy(where);
    }

    async findOneWithSecret(where: Record<string, any>): Promise<Robot | null> {
        const qb = this.repository.createQueryBuilder('robot');

        Object.entries(where).forEach(([key, value]) => {
            qb.andWhere(`robot.${key} = :${key}`, { [key]: value });
        });

        qb.addSelect('robot.secret');

        return qb.getOne();
    }

    create(data: Partial<Robot>): Robot {
        return this.repository.create(data);
    }

    merge(entity: Robot, data: Partial<Robot>): Robot {
        return this.repository.merge(entity, data);
    }

    async save(entity: Robot): Promise<Robot> {
        return this.repository.save(entity);
    }

    async remove(entity: Robot): Promise<void> {
        await this.repository.remove(entity as any);
    }

    async validateJoinColumns(data: Partial<Robot>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: RobotEntity,
        });
    }

    async checkUniqueness(data: Partial<Robot>, existing?: Robot): Promise<void> {
        const isUnique = await isEntityUnique({
            dataSource: this.repository.manager.connection,
            entityTarget: RobotEntity,
            entity: data,
            entityExisting: existing,
        });

        if (!isUnique) {
            throw new DatabaseConflictError();
        }
    }
}
