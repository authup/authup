/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy, PolicyVariant } from '@authup/core-kit';
import {
    hasOwnProperty,
} from '@authup/kit';
import type { DataSource, EntityManager } from 'typeorm';
import { InstanceChecker, TreeRepository } from 'typeorm';
import { PolicyAttributeEntity } from '../policy-attribute/entity';
import { PolicyEntity } from './entity';
import { transformAttributesToEntities, transformAttributesToRecord } from '../utils';

export class PolicyRepository extends TreeRepository<PolicyEntity> {
    constructor(instance: DataSource | EntityManager) {
        super(PolicyEntity, InstanceChecker.isDataSource(instance) ? instance.manager : instance);
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

    async saveAttributes(id: Policy['id'], attributes: Record<string, any>) : Promise<void> {
        const repository = this.manager.getRepository(PolicyAttributeEntity);

        let entities = await repository.find({
            where: {
                policy_id: id,
            },
        });

        const reamingAttributes : Record<string, any> = {
            ...attributes,
        };

        const entitiesToRemove : PolicyAttributeEntity[] = [];

        for (let i = 0; i < entities.length; i++) {
            if (hasOwnProperty(reamingAttributes, entities[i].name)) {
                entities[i].value = reamingAttributes[entities[i].name];
                delete reamingAttributes[entities[i].name];
            } else {
                entitiesToRemove.push(entities[i]);
            }
        }

        await repository.save(entities);

        if (entitiesToRemove.length > 0) {
            await repository.remove(entitiesToRemove);
        }

        entities = transformAttributesToEntities<PolicyAttributeEntity>(
            reamingAttributes,
            {
                policy_id: id,
            },
        );

        if (entities.length > 0) {
            await repository.insert(entities);
        }
    }

    appendAttributes<T extends Policy>(entity: T, attributes: Record<string, any>) : T {
        const keys = Object.keys(attributes);
        for (let i = 0; i < keys.length; i++) {
            entity[keys[i]] = attributes[keys[i]];
        }

        return entity;
    }

    async extendEntity(entity: Policy) : Promise<PolicyVariant> {
        const attributes = await this.getAttributes(entity.id);

        this.appendAttributes(entity, attributes);

        return entity as PolicyVariant;
    }
}
