/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAccount } from '@authup/core-kit';
import type { DeepPartial } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import type { IIdentityProviderAccountRepository, IdentityProviderIdentity } from '../../../../../../core';
import { IdentityProviderAccountEntity } from '../../../../domains';

export class IdentityProviderAccountRepository implements IIdentityProviderAccountRepository {
    async findOneByProviderIdentity(identity: IdentityProviderIdentity): Promise<IdentityProviderAccount | null> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(IdentityProviderAccountEntity);

        return repository.findOne({
            where: {
                provider_user_id: identity.id,
                provider_id: identity.provider.id,
            },
            relations: ['user'],
        });
    }

    async save(entity: DeepPartial<IdentityProviderAccount>): Promise<IdentityProviderAccount> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(IdentityProviderAccountEntity);

        return repository.save(entity);
    }
}
