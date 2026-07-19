/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAccount } from '@authup/core-kit';
import type { DataSource, DeepPartial } from 'typeorm';
import type { IIdentityProviderAccountRepository, IdentityProviderIdentity } from '../../../../../../core/index.ts';
import { IdentityProviderAccountEntity } from '../../../../../../adapters/database/domains/index.ts';

export class IdentityProviderAccountRepository implements IIdentityProviderAccountRepository {
    protected dataSource : DataSource;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
    }

    async findOneByProviderIdentity(identity: IdentityProviderIdentity): Promise<IdentityProviderAccount | null> {
        const repository = this.dataSource.getRepository(IdentityProviderAccountEntity);

        return repository.findOne({
            where: {
                providerUserId: identity.id,
                providerId: identity.provider.id,
            },
            relations: { user: true },
        });
    }

    async save(entity: DeepPartial<IdentityProviderAccount>): Promise<IdentityProviderAccount> {
        const repository = this.dataSource.getRepository(IdentityProviderAccountEntity);

        return repository.save(entity);
    }
}
