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
import { CachePrefix } from '../constants.ts';
import { EARepository } from '../../extra-attribute-repository/index.ts';
import { IdentityProviderEntity } from './entity.ts';
import { IdentityProviderAttributeEntity } from '../identity-provider-attribute/index.ts';

export class IdentityProviderRepository extends EARepository<
IdentityProviderEntity,
IdentityProviderAttributeEntity
> {
    constructor(instance: DataSource | EntityManager) {
        super(
            InstanceChecker.isDataSource(instance) ? instance.manager : instance,
            {
                attributeProperties: (entity, parent) => {
                    entity.provider_id = parent.id;
                    entity.realm_id = parent.realm_id;

                    return entity;
                },
                entity: IdentityProviderEntity,
                entityPrimaryColumn: 'id',
                attributeEntity: IdentityProviderAttributeEntity,
                attributeForeignColumn: 'provider_id',
                cachePrefix: CachePrefix.IDENTITY_PROVIDER_ATTRIBUTE,
            },
        );
    }
}
