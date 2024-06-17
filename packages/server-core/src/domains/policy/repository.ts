/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSource, EntityManager } from 'typeorm';
import { EATreeRepository } from '../core';
import { PolicyAttributeEntity } from '../policy-attribute/entity';
import { PolicyEntity } from './entity';

export class PolicyRepository extends EATreeRepository<PolicyEntity, PolicyAttributeEntity> {
    constructor(instance: DataSource | EntityManager) {
        super(instance, {
            attributeProperties: (input, parent) => {
                input.policy_id = parent.id;
                input.realm_id = parent.realm_id;

                return input;
            },
            entity: PolicyEntity,
            entityPrimaryColumn: 'id',
            attributeEntity: PolicyAttributeEntity,
            attributeForeignColumn: 'policy_id',
            // cachePrefix: CachePrefix.POLICY_OWNED_ATTRIBUTES,
        });
    }
}
