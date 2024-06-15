/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    DataSource, EntityManager,
} from 'typeorm';
import { InstanceChecker } from 'typeorm';
import { CachePrefix } from '../constants';
import { ExtraAttributeRepository } from '../core';
import { IdentityProviderEntity } from './entity';
import { IdentityProviderAttributeEntity } from '../identity-provider-attribute';

export class IdentityProviderRepository extends ExtraAttributeRepository<
IdentityProviderEntity,
IdentityProviderAttributeEntity
> {
    constructor(instance: DataSource | EntityManager) {
        super(
            InstanceChecker.isDataSource(instance) ? instance.manager : instance,
            {
                entity: IdentityProviderEntity,
                entityPrimaryColumn: 'id',
                attributeEntity: IdentityProviderAttributeEntity,
                attributeForeignColumn: 'provider_id',
                cachePrefix: CachePrefix.IDENTITY_PROVIDER_ATTRIBUTE,
            },
        );
    }
}
