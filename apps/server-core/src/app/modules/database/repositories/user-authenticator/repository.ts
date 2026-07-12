/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserAuthenticator, UserAuthenticatorKind } from '@authup/core-kit';
import { EntityConflictError } from '@authup/errors';
import type { Repository } from 'typeorm';
import { OptimisticLockVersionMismatchError } from 'typeorm';
import { applyQuery } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type {
    IUserAuthenticatorRepository,
    UserAuthenticatorFindManyOptions,
    UserAuthenticatorSecretsFilter,
} from '../../../../../core/index.ts';
import { applyRealmScopeSelect } from '../helpers.ts';

export class UserAuthenticatorRepositoryAdapter implements IUserAuthenticatorRepository {
    private readonly repository: Repository<UserAuthenticator>;

    constructor(repository: Repository<UserAuthenticator>) {
        this.repository = repository;
    }

    create(data: Partial<UserAuthenticator>): UserAuthenticator {
        return this.repository.create(data);
    }

    async save(entity: UserAuthenticator): Promise<UserAuthenticator> {
        try {
            return await this.repository.save(entity);
        } catch (e) {
            // Translate the TypeORM optimistic-lock conflict into a
            // DB-agnostic domain error so the core service (which must not
            // know about typeorm) can react to a concurrent write.
            if (e instanceof OptimisticLockVersionMismatchError) {
                throw new EntityConflictError();
            }
            throw e;
        }
    }

    async remove(entity: UserAuthenticator): Promise<void> {
        await this.repository.remove(entity);
    }

    async removeAllByUser(userId: string, kind: `${UserAuthenticatorKind}`): Promise<void> {
        await this.repository.delete({ user_id: userId, kind });
    }

    async findOneById(id: string): Promise<UserAuthenticator | null> {
        return this.repository.findOneBy({ id });
    }

    async findOneWithSecretsById(id: string): Promise<UserAuthenticator | null> {
        return this.repository.createQueryBuilder('userAuthenticator')
            .addSelect(['userAuthenticator.secret', 'userAuthenticator.codes'])
            .where('userAuthenticator.id = :id', { id })
            .getOne();
    }

    async findAllByUser(userId: string): Promise<UserAuthenticator[]> {
        return this.repository.find({ where: { user_id: userId } });
    }

    async findAllWithSecretsByUser(
        userId: string,
        filter: UserAuthenticatorSecretsFilter = {},
    ): Promise<UserAuthenticator[]> {
        const qb = this.repository.createQueryBuilder('userAuthenticator')
            .addSelect(['userAuthenticator.secret', 'userAuthenticator.codes'])
            .where('userAuthenticator.user_id = :userId', { userId });

        if (filter.kind) {
            qb.andWhere('userAuthenticator.kind = :kind', { kind: filter.kind });
        }

        if (typeof filter.confirmed !== 'undefined') {
            qb.andWhere('userAuthenticator.confirmed = :confirmed', { confirmed: filter.confirmed });
        }

        return qb.getMany();
    }

    async hasConfirmedByUser(userId: string): Promise<boolean> {
        const count = await this.repository.countBy({ user_id: userId, confirmed: true });
        return count > 0;
    }

    async findMany(
        query: Record<string, any>,
        options: UserAuthenticatorFindManyOptions = {},
    ): Promise<EntityRepositoryFindManyResult<UserAuthenticator>> {
        const qb = this.repository.createQueryBuilder('userAuthenticator');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'userAuthenticator',
            fields: {
                allowed: [
                    'id',
                    'kind',
                    'name',
                    'confirmed',
                    'last_used_at',
                    'created_at',
                    'updated_at',
                    'user_id',
                    'realm_id',
                ],
            },
            filters: { allowed: ['id', 'kind', 'confirmed', 'user_id', 'realm_id'] },
            sort: { allowed: ['created_at', 'updated_at', 'last_used_at'] },
            pagination: { maxLimit: 50 },
        });

        applyRealmScopeSelect(qb, 'userAuthenticator', ['user_id']);

        if (options.owner) {
            // mandatory constraint — not overridable by a rapiq filter
            qb.andWhere('userAuthenticator.user_id = :ownerUserId', { ownerUserId: options.owner.userId });
        }

        const [entities, total] = await qb.getManyAndCount();

        return {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        };
    }
}
