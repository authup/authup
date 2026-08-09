/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAccount } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type {
    DataSource, 
    DeepPartial, 
    Repository,
} from 'typeorm';
import { applyQuery, redactFieldConditions } from '../query.ts';
import { IdentityProviderAccountEntity } from '../../../../../adapters/database/domains/index.ts';
import type {
    IIdentityProviderAccountRepository,
    IdentityProviderAccountFindManyOptions,
    IdentityProviderIdentity,
} from '../../../../../core/index.ts';

export class IdentityProviderAccountRepositoryAdapter implements IIdentityProviderAccountRepository {
    protected repository: Repository<IdentityProviderAccountEntity>;

    constructor(dataSource: DataSource) {
        this.repository = dataSource.getRepository(IdentityProviderAccountEntity);
    }

    async findMany(
        query: IQuery,
        options: IdentityProviderAccountFindManyOptions = {},
    ): Promise<EntityRepositoryFindManyResult<IdentityProviderAccount>> {
        const qb = this.repository.createQueryBuilder('identityProviderAccount');

        const { pagination } = applyQuery(qb, query);

        // plan-039 force-select: the per-row gate reads userId (ownership)
        // and userRealmId (realm reach). The shared applyRealmScopeSelect
        // pins a `realmId` column this entity does not have, so dedupe and
        // add the two columns the same way it would.
        const existing = new Set(qb.expressionMap.selects.map((select) => select.selection));
        const selections = ['userId', 'userRealmId']
            .map((column) => `identityProviderAccount.${column}`)
            .filter((selection) => !existing.has(selection));
        if (selections.length > 0) {
            qb.addSelect(selections);
        }

        if (options.userId) {
            // mandatory constraint — not overridable by a rapiq filter
            qb.andWhere('identityProviderAccount.userId = :ownerUserId', { ownerUserId: options.userId });
        }

        if (options.realmId) {
            // nested `/realms/:realmId/identity-provider-accounts` mount —
            // mandatory constraint, not overridable by a rapiq filter
            qb.andWhere('identityProviderAccount.userRealmId = :ownerRealmId', { ownerRealmId: options.realmId });
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

    async findOneById(id: string): Promise<IdentityProviderAccount | null> {
        return this.repository.findOneBy({ id });
    }

    async countByUserId(userId: string): Promise<number> {
        return this.repository.countBy({ userId });
    }

    async findOneByProviderIdentity(identity: IdentityProviderIdentity): Promise<IdentityProviderAccount | null> {
        return this.repository.findOne({
            where: {
                providerUserId: identity.id,
                providerId: identity.provider.id,
            },
            relations: { user: true },
        });
    }

    async save(entity: DeepPartial<IdentityProviderAccount>): Promise<IdentityProviderAccount> {
        return this.repository.save(entity);
    }

    async remove(entity: IdentityProviderAccount): Promise<void> {
        await this.repository.remove(entity as IdentityProviderAccountEntity);
    }
}
