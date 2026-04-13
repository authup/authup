/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderRoleMapping } from '@authup/core-kit';
import { useDataSource } from 'typeorm-extension';
import type { IIdentityProviderRoleMappingFinder } from '../../../../../../core/index.ts';
import { IdentityProviderRoleMappingEntity } from '../../../../../../adapters/database/domains/index.ts';

export class IdentityProviderRoleMappingRepository implements IIdentityProviderRoleMappingFinder {
    async findByProviderId(providerId: string): Promise<IdentityProviderRoleMapping[]> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(IdentityProviderRoleMappingEntity);

        return repository.findBy({ provider_id: providerId });
    }
}
