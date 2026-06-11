/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderRoleMapping } from '@authup/core-kit';
import type { DataSource } from 'typeorm';
import type { IIdentityProviderRoleMappingFinder } from '../../../../../../core/index.ts';
import { IdentityProviderRoleMappingEntity } from '../../../../../../adapters/database/domains/index.ts';

export class IdentityProviderRoleMappingRepository implements IIdentityProviderRoleMappingFinder {
    protected dataSource : DataSource;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
    }

    async findByProviderId(providerId: string): Promise<IdentityProviderRoleMapping[]> {
        const repository = this.dataSource.getRepository(IdentityProviderRoleMappingEntity);

        return repository.findBy({ provider_id: providerId });
    }
}
