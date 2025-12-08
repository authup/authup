/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderIdentity } from '../../types';
import { IdentityProviderAccountBaseMapper } from '../base';
import type { IdentityProviderMapperElement } from '../types';
import type { IIdentityProviderPermissionMappingRepository } from './types';

export class IdentityProviderPermissionMapper extends IdentityProviderAccountBaseMapper {
    protected repository: IIdentityProviderPermissionMappingRepository;

    constructor(repository: IIdentityProviderPermissionMappingRepository) {
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
                value: entity.permission_id,
                realmId: entity.permission_realm_id,
                operation,
            });
        }

        return items;
    }
}
