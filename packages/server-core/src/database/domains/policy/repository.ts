/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { definePolicyWithType } from '@authup/access';
import type { BuiltInPolicyTypeMap, PolicyWithType } from '@authup/access';
import type { DataSource, EntityManager } from 'typeorm';
import { CachePrefix } from '../constants';
import { EATreeRepository } from '../../extra-attribute-repository';
import { PolicyAttributeEntity } from '../policy-attribute';
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
            cachePrefix: CachePrefix.POLICY_OWNED_ATTRIBUTES,
        });
    }

    createByType<
        K extends keyof BuiltInPolicyTypeMap,
        D extends BuiltInPolicyTypeMap<any>[K] & Partial<Omit<PolicyEntity, 'type'>>,
    >(type: K, data: D) : PolicyWithType<D, K> {
        return definePolicyWithType(type, {
            ...this.create(),
            ...data,
        });
    }
}
