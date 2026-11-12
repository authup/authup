/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BasePolicy } from '@authup/access';
import type { Policy, PolicyAttribute } from '@authup/core-kit';
import type { DataSource, EntityManager, FindTreeOptions } from 'typeorm';
import { EntityNotFoundError } from 'typeorm';
import { EATreeRepository } from '../../extra-attribute-repository/index.ts';
import { PolicyAttributeEntity } from '../policy-attribute/index.ts';
import { PolicyEntity } from './entity.ts';

/**
 * The descendants query carries no ORDER BY, so the database decides the
 * order of a composite's children per read. Evaluation does not depend on it,
 * but everything serialized from a tree (the authorization catalog, the
 * introspected grants) would differ between two reads of the same data.
 */
function sortChildren(policy: Policy): void {
    if (!Array.isArray(policy.children)) {
        return;
    }

    policy.children.sort((a, b) => {
        if (a.name !== b.name) {
            return a.name < b.name ? -1 : 1;
        }

        if (a.id === b.id) {
            return 0;
        }

        return a.id < b.id ? -1 : 1;
    });

    for (const child of policy.children) {
        sortChildren(child);
    }
}

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
        });
    }

    override async findDescendantsTree(
        entity: Policy,
        options?: FindTreeOptions,
    ): Promise<Policy> {
        const tree = await super.findDescendantsTree(entity, options);

        sortChildren(tree);

        return tree;
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
