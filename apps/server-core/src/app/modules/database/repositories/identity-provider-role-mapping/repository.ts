/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderRoleMapping } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { IIdentityProviderRoleMappingRepository } from '../../../../../core/index.ts';
import { IdentityProviderRoleMappingEntity } from '../../../../../adapters/database/domains/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';

export class IdentityProviderRoleMappingRepositoryAdapter extends EntityRepositoryAdapter<IdentityProviderRoleMapping>
    implements IIdentityProviderRoleMappingRepository {
    constructor(repository: Repository<IdentityProviderRoleMapping>) {
        super(repository, {
            alias: 'providerRole',
            target: IdentityProviderRoleMappingEntity,
            entity: 'identity provider role mapping',
            realmScope: { column: 'providerRealmId' },
        });
    }
}
