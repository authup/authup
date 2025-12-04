/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAccount } from '@authup/core-kit';
import type { IdentityProviderIdentity } from '../../types';
import { IdentityProviderAccountBaseMapper } from '../base';
import type { IdentityProviderMapperElement } from '../types';
import type { IIdentityProviderRoleMappingRepository } from './types';

export class IdentityProviderRoleMapper extends IdentityProviderAccountBaseMapper {
    protected repository: IIdentityProviderRoleMappingRepository;

    async execute(identity: IdentityProviderIdentity, account: IdentityProviderAccount): Promise<void> {
        const entities = await this.repository.findByProviderId(account.provider_id);

        const items : IdentityProviderMapperElement[] = [];
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            const [operation] = this.resolve(identity, entity);

            items.push({
                id: entity.permission_id,
                realmId: entity.permission_realm_id,
                operation,
            });
        }

        return items;
    }
}
