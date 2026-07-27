/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserAuthenticator, UserAuthenticatorKind } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { Repository } from 'typeorm';
import { applyQuery, redactFieldConditions } from '../query.ts';
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
        return this.repository.save(entity);
    }

    async remove(entity: UserAuthenticator): Promise<void> {
        await this.repository.remove(entity);
    }

    async removeAllByUser(userId: string, kind: `${UserAuthenticatorKind}`): Promise<void> {
        await this.repository.delete({ userId, kind });
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
        return this.repository.find({ where: { userId } });
    }

    async findAllWithSecretsByUser(
        userId: string,
        filter: UserAuthenticatorSecretsFilter = {},
    ): Promise<UserAuthenticator[]> {
        const qb = this.repository.createQueryBuilder('userAuthenticator')
            .addSelect(['userAuthenticator.secret', 'userAuthenticator.codes'])
            .where('userAuthenticator.userId = :userId', { userId });

        if (filter.kind) {
            qb.andWhere('userAuthenticator.kind = :kind', { kind: filter.kind });
        }

        if (typeof filter.confirmed !== 'undefined') {
            qb.andWhere('userAuthenticator.confirmed = :confirmed', { confirmed: filter.confirmed });
        }

        return qb.getMany();
    }

    async hasConfirmedByUser(userId: string): Promise<boolean> {
        const count = await this.repository.countBy({ userId, confirmed: true });
        return count > 0;
    }

    async findMany(
        query: IQuery,
        options: UserAuthenticatorFindManyOptions = {},
    ): Promise<EntityRepositoryFindManyResult<UserAuthenticator>> {
        const qb = this.repository.createQueryBuilder('userAuthenticator');

        const { pagination } = applyQuery(qb, query);

        applyRealmScopeSelect(qb, 'userAuthenticator', ['userId']);

        if (options.owner) {
            // mandatory constraint — not overridable by a rapiq filter
            qb.andWhere('userAuthenticator.userId = :ownerUserId', { ownerUserId: options.owner.userId });
        }

        const [entities, total] = await qb.getManyAndCount();

        return {
            data: redactFieldConditions(query, entities),
            meta: {
                total,
                ...pagination,
            },
        };
    }
}
