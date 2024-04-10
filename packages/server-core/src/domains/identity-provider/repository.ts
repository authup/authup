/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IdentityProvider,
    IdentityProviderProtocolType,
} from '@authup/core';
import {
    hasOwnProperty,
} from '@authup/core';
import type { DataSource, EntityManager } from 'typeorm';
import { InstanceChecker, Repository } from 'typeorm';
import { IdentityProviderEntity } from './entity';
import { transformAttributesToEntities, transformAttributesToRecord } from '../utils';
import { IdentityProviderAttributeEntity } from '../identity-provider-attribute';

export class IdentityProviderRepository extends Repository<IdentityProviderEntity> {
    constructor(instance: DataSource | EntityManager) {
        super(IdentityProviderEntity, InstanceChecker.isDataSource(instance) ? instance.manager : instance);
    }

    async getAttributes(id: IdentityProvider['id']) : Promise<Record<string, any>> {
        const repository = this.manager.getRepository(IdentityProviderAttributeEntity);
        const entities = await repository.find({
            where: {
                provider_id: id,
            },
        });

        return transformAttributesToRecord(entities);
    }

    async saveAttributes(id: IdentityProvider['id'], attributes: Record<string, any>) : Promise<void> {
        const repository = this.manager.getRepository(IdentityProviderAttributeEntity);

        let entities = await repository.find({
            where: {
                provider_id: id,
            },
        });

        const reamingAttributes : Record<string, any> = {
            ...attributes,
        };

        const entitiesToRemove : IdentityProviderAttributeEntity[] = [];

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

        entities = transformAttributesToEntities<IdentityProviderAttributeEntity>(
            reamingAttributes,
            {
                provider_id: id,
            },
        );

        if (entities.length > 0) {
            await repository.insert(entities);
        }
    }

    appendAttributes<T extends IdentityProvider>(entity: T, attributes: Record<string, any>) : T {
        const keys = Object.keys(attributes);
        for (let i = 0; i < keys.length; i++) {
            entity[keys[i]] = attributes[keys[i]];
        }

        return entity;
    }

    async extendEntity(entity: IdentityProvider) : Promise<IdentityProviderProtocolType> {
        const attributes = await this.getAttributes(entity.id);

        this.appendAttributes(entity, attributes);

        return entity as IdentityProviderProtocolType;
    }
}
