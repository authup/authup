/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy, PolicyBuiltIn } from '@authup/core-kit';
import type { DataSource, EntityManager } from 'typeorm';
import { EATreeRepository } from '../core';
import { PolicyAttributeEntity } from '../policy-attribute/entity';
import { PolicyEntity } from './entity';
import { transformAttributesToRecord } from '../utils';

export class PolicyRepository extends EATreeRepository<PolicyEntity, PolicyAttributeEntity> {
    constructor(instance: DataSource | EntityManager) {
        super(instance, {
            attributeProperties: (input, parent) => {
                input.policy_id = parent.id;
                // input.policy_realm_id = parent.realm_id;

                return input;
            },
            entity: PolicyEntity,
            entityPrimaryColumn: 'id',
            attributeEntity: PolicyAttributeEntity,
            attributeForeignColumn: 'policy_id',
            // cachePrefix: CachePrefix.POLICY_OWNED_ATTRIBUTES,
        });
    }

    async getAttributes(id: Policy['id']) : Promise<Record<string, any>> {
        const repository = this.manager.getRepository(PolicyAttributeEntity);
        const entities = await repository.find({
            where: {
                policy_id: id,
            },
        });

        return transformAttributesToRecord(entities);
    }

    appendAttributes<T extends Policy>(entity: T, attributes: Record<string, any>) : T {
        const keys = Object.keys(attributes);
        for (let i = 0; i < keys.length; i++) {
            entity[keys[i]] = attributes[keys[i]];
        }

        return entity;
    }

    async extendEntity(entity: Policy) : Promise<PolicyBuiltIn> {
        const attributes = await this.getAttributes(entity.id);

        this.appendAttributes(entity, attributes);

        return entity as PolicyBuiltIn;
    }
}
