/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { IdentityProviderIdentity } from '../../types';
import { IdentityProviderAccountBaseMapper } from '../base';
import type { IdentityProviderMapperElement } from '../types';

export class IdentityProviderAttributeMapper extends IdentityProviderAccountBaseMapper {
    protected repository: IIdentityProviderAttributeMappingRepository;

    async execute(identity: IdentityProviderIdentity): Promise<IdentityProviderMapperElement[]> {
        const entities = await this.repository.findByProviderId(account.provider_id);

        const items : IdentityProviderMapperElement[] = [];
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            const [operation, value] = this.resolve(identity, entity);

            items.push({
                key: entity.target_name,
                value: entity.target_value ? entity.target_value : value,
                realmId: entity.permission_realm_id,
                operation,
            });
        }

        return items;
    }
}
