/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { IQuery } from '@rapiq/core';
import type { IdentityProviderAccount } from '@authup/core-kit';
import type { DeepPartial } from 'typeorm';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type {
    IIdentityProviderAccountRepository,
    IdentityProviderAccountFindManyOptions,
    IdentityProviderIdentity,
} from '../../../../../src/core/index.ts';

export class FakeIdentityProviderAccountRepository implements IIdentityProviderAccountRepository {
    public removeCalls: IdentityProviderAccount[] = [];

    public findManyCalls: { query: IQuery, options: IdentityProviderAccountFindManyOptions }[] = [];

    private accounts = new Map<string, IdentityProviderAccount>();

    seed(account: Partial<IdentityProviderAccount>): IdentityProviderAccount {
        const entity = {
            id: account.id || randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...account,
        } as IdentityProviderAccount;
        this.accounts.set(entity.id, entity);
        return entity;
    }

    rows(): IdentityProviderAccount[] {
        return [...this.accounts.values()];
    }

    async findMany(
        query: IQuery,
        options: IdentityProviderAccountFindManyOptions = {},
    ): Promise<EntityRepositoryFindManyResult<IdentityProviderAccount>> {
        this.findManyCalls.push({ query, options });

        let data = this.rows();
        if (options.userId) {
            data = data.filter((account) => account.userId === options.userId);
        }
        if (options.realmId) {
            data = data.filter((account) => account.userRealmId === options.realmId);
        }

        return {
            data,
            meta: {
                total: data.length,
                limit: 50,
                offset: 0,
            },
        };
    }

    async findOneById(id: string): Promise<IdentityProviderAccount | null> {
        return this.accounts.get(id) ?? null;
    }

    async removeGuarded(entity: IdentityProviderAccount, userHasOtherLogin: boolean): Promise<boolean> {
        const count = this.rows().filter((account) => account.userId === entity.userId).length;
        if (count <= 1 && !userHasOtherLogin) {
            return false;
        }

        this.removeCalls.push(entity);
        this.accounts.delete(entity.id);
        return true;
    }

    async findOneByProviderIdentity(identity: IdentityProviderIdentity): Promise<IdentityProviderAccount | null> {
        return this.rows().find(
            (account) => account.providerId === identity.provider.id &&
                account.providerUserId === identity.id,
        ) ?? null;
    }

    async save(entity: DeepPartial<IdentityProviderAccount>): Promise<IdentityProviderAccount> {
        if (entity.id && this.accounts.has(entity.id)) {
            const existing = {
                ...this.accounts.get(entity.id)!,
                ...entity,
            } as IdentityProviderAccount;
            this.accounts.set(existing.id, existing);
            return existing;
        }

        return this.seed(entity as Partial<IdentityProviderAccount>);
    }

    async remove(entity: IdentityProviderAccount): Promise<void> {
        this.removeCalls.push(entity);
        this.accounts.delete(entity.id);
    }
}

