/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderIdentity } from '../../types.ts';
import { IdentityProviderAccountBaseMapper } from '../base.ts';
import type { IdentityProviderMapperElement } from '../types.ts';
import type { IIdentityProviderRoleMappingRepository } from './types.ts';

export class IdentityProviderRoleMapper extends IdentityProviderAccountBaseMapper {
    protected repository: IIdentityProviderRoleMappingRepository;

    constructor(repository: IIdentityProviderRoleMappingRepository) {
        super();

        this.repository = repository;
    }

    async execute(identity: IdentityProviderIdentity): Promise<IdentityProviderMapperElement[]> {
        const entities = await this.repository.findByProviderId(identity.provider.id);

        const items : IdentityProviderMapperElement[] = [];
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            const [operation] = this.resolve(identity, entity);

            items.push({
                value: entity.role_id,
                realmId: entity.role_realm_id,
                operation,
            });
        }

        return items;
    }
}
