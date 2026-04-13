/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderIdentity } from '../../types.ts';
import { IdentityProviderAccountBaseMapper } from '../base.ts';
import type { IdentityProviderMapperElement } from '../types.ts';
import type { IIdentityProviderRoleMappingFinder } from './types.ts';

export class IdentityProviderRoleMapper extends IdentityProviderAccountBaseMapper {
    protected finder: IIdentityProviderRoleMappingFinder;

    constructor(finder: IIdentityProviderRoleMappingFinder) {
        super();

        this.finder = finder;
    }

    async execute(identity: IdentityProviderIdentity): Promise<IdentityProviderMapperElement[]> {
        const entities = await this.finder.findByProviderId(identity.provider.id);

        const items : IdentityProviderMapperElement[] = [];
        for (const entity of entities) {
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
