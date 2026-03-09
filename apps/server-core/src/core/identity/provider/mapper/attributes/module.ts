/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { IdentityProviderIdentity } from '../../types.ts';
import { IdentityProviderAccountBaseMapper } from '../base.ts';
import type { IdentityProviderMapperElement } from '../types.ts';
import type { IIdentityProviderAttributeMappingRepository } from './types.ts';

export class IdentityProviderAttributeMapper extends IdentityProviderAccountBaseMapper {
    protected repository: IIdentityProviderAttributeMappingRepository;

    constructor(repository: IIdentityProviderAttributeMappingRepository) {
        super();

        this.repository = repository;
    }

    async execute(identity: IdentityProviderIdentity): Promise<IdentityProviderMapperElement[]> {
        const entities = await this.repository.findByProviderId(identity.provider.id);

        const items : IdentityProviderMapperElement[] = [];
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            const [operation, value] = this.resolve(identity, entity);

            items.push({
                key: entity.target_name,
                value: entity.target_value ? entity.target_value : value,
                realmId: entity.provider_realm_id,
                operation,
            });
        }

        return items;
    }
}
