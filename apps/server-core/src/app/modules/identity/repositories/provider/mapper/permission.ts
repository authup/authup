/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderPermissionMapping } from '@authup/core-kit';
import type { DataSource } from 'typeorm';
import type { IIdentityProviderPermissionMappingRepository } from '../../../../../../core/index.ts';
import { IdentityProviderPermissionMappingEntity } from '../../../../../../adapters/database/domains/index.ts';

export class IdentityProviderPermissionMappingRepository implements IIdentityProviderPermissionMappingRepository {
    protected dataSource : DataSource;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
    }

    async findByProviderId(providerId: string): Promise<IdentityProviderPermissionMapping[]> {
        const repository = this.dataSource.getRepository(IdentityProviderPermissionMappingEntity);

        return repository.findBy({ provider_id: providerId });
    }
}
