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
                input.policyId = parent.id;
                input.realmId = parent.realmId;

                return input;
            },
            entity: PolicyEntity,
            entityPrimaryColumn: 'id',
            attributeEntity: PolicyAttributeEntity,
            attributeForeignColumn: 'policyId',
            cachePrefix: CachePrefix.POLICY_OWNED_ATTRIBUTES,
        });
    }

    async findDescendantsTreeById(id: string): Promise<BasePolicy | null> {
        // The root must be a fully-loaded row: findDescendantsTree() mutates
        // the passed entity (children + EA) but never populates its base
        // columns — an id-only stub would yield a `type`-less tree that every
        // engine consumer fails closed on (policyEvaluatorNotFound).
        const entity = await this.findOneBy({ id });
        if (!entity) {
            return null;
        }

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
