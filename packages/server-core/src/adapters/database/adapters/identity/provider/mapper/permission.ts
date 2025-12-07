/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderPermissionMapping } from '@authup/core-kit';
import { useDataSource } from 'typeorm-extension';
import type { IIdentityProviderPermissionMappingRepository } from '../../../../../../core';
import { IdentityProviderPermissionMappingEntity } from '../../../../domains';

export class IdentityProviderPermissionMappingRepository implements IIdentityProviderPermissionMappingRepository {
    async findByProviderId(providerId: string): Promise<IdentityProviderPermissionMapping[]> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(IdentityProviderPermissionMappingEntity);

        return repository.findBy({
            provider_id: providerId,
        });
    }
}
