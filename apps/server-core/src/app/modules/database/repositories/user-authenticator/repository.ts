/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserAuthenticator, UserAuthenticatorKind } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { applyQuery, fetchMany } from '../query.ts';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type {
    IUserAuthenticatorRepository,
    UserAuthenticatorFindManyOptions,
    UserAuthenticatorSecretsFilter,
} from '../../../../../core/index.ts';
import { isDatabaseTypeRowLockable } from '../../../../../adapters/database/helpers/index.ts';
import { UserAuthenticatorEntity, UserEntity } from '../../../../../adapters/database/domains/index.ts';
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

    async withUserLock<R>(
        userId: string,
        fn: (repository: IUserAuthenticatorRepository) => Promise<R>,
    ): Promise<R> {
        const dataSource = this.repository.manager.connection;

        if (!isDatabaseTypeRowLockable(dataSource.options.type)) {
            // better-sqlite3: no FOR UPDATE, and the driver shares one query
            // runner, so a transaction here would nest inside whatever else
            // runs on it (the removeGuarded rule)
            return fn(this);
        }

        return dataSource.transaction(async (manager) => {
            await manager.getRepository(UserEntity)
                .createQueryBuilder('user')
                .select('user.id')
                .where('user.id = :id', { id: userId })
                .setLock('pessimistic_write')
                .getOne();

            return fn(new UserAuthenticatorRepositoryAdapter(manager.getRepository(UserAuthenticatorEntity)));
        });
    }

    async findOneById(id: string): Promise<UserAuthenticator | null> {
        if (!isUUID(id)) {
            return null;
        }

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
            if (!isUUID(options.owner.userId)) {
                // no row can carry a non-uuid owner: answer the empty page
                // every dialect would, rather than the parse error postgres
                // raises for the bind
                return { data: [], meta: { total: 0, ...pagination } };
            }

            // mandatory constraint — not overridable by a rapiq filter
            qb.andWhere('userAuthenticator.userId = :ownerUserId', { ownerUserId: options.owner.userId });
        }

        const { data: entities, total } = await fetchMany(qb, query);

        return {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        };
    }
}
