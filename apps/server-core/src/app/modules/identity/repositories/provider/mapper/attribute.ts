/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAttributeMapping } from '@authup/core-kit';
import { useDataSource } from 'typeorm-extension';
import type { IIdentityProviderAttributeMappingRepository } from '../../../../../../core/index.ts';
import { IdentityProviderAttributeMappingEntity } from '../../../../../../adapters/database/domains/index.ts';

export class IdentityProviderAttributeMappingRepository implements IIdentityProviderAttributeMappingRepository {
    async findByProviderId(providerId: string): Promise<IdentityProviderAttributeMapping[]> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(IdentityProviderAttributeMappingEntity);

        return repository.findBy({
            provider_id: providerId,
        });
    }
}
