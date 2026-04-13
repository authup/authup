/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderIdentity } from '../../types.ts';
import { IdentityProviderAccountBaseMapper } from '../base.ts';
import type { IdentityProviderMapperElement } from '../types.ts';
import type { IIdentityProviderPermissionMappingFinder } from './types.ts';

export class IdentityProviderPermissionMapper extends IdentityProviderAccountBaseMapper {
    protected finder: IIdentityProviderPermissionMappingFinder;

    constructor(finder: IIdentityProviderPermissionMappingFinder) {
        super();

        this.finder = finder;
    }

    async execute(identity: IdentityProviderIdentity): Promise<IdentityProviderMapperElement[]> {
        const entities = await this.finder.findByProviderId(identity.provider.id);

        const items : IdentityProviderMapperElement[] = [];
        for (const entity of entities) {
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
