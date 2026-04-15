/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BasePolicy } from '@authup/access';
import type { Policy, PolicyAttribute } from '@authup/core-kit';
import type { DataSource, EntityManager } from 'typeorm';
import { EntityNotFoundError } from 'typeorm';
import { CachePrefix } from '../constants.ts';
import { EATreeRepository } from '../../extra-attribute-repository/index.ts';
import { PolicyAttributeEntity } from '../policy-attribute/index.ts';
import { PolicyEntity } from './entity.ts';

export class PolicyRepository extends EATreeRepository<Policy, PolicyAttribute> {
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

    async findDescendantsTreeById(id: string): Promise<BasePolicy | null> {
        const entity = this.create();
        entity.id = id;

        try {
            return await this.findDescendantsTree(entity);
        } catch (e) {
            if (e instanceof EntityNotFoundError) {
                return null;
            }

            throw e;
        }
    }
}
