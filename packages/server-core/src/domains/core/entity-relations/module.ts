/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@ebec/http';
import type { EntityTarget } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import { buildRequestValidationErrorMessage } from '../../../http/validation';

export type EntityRelationKeys<T extends Record<string, any>> = ({
    [K in keyof T]?: T[K] extends Record<string, any> ?
        T[K] extends Date ? never : K :
        never
})[keyof T];

export type EntityRelations<T extends Record<string, any>> = {
    [K in EntityRelationKeys<T>]?: T[K]
};

export async function lookupRepositoryEntityRelations<T>(
    entity: EntityTarget<T>,
    where: Partial<T>,
) : Promise<EntityRelations<T>> {
    const dataSource = await useDataSource();
    const index = dataSource.entityMetadatas.findIndex(
        (entityMetadata) => entityMetadata.target === entity,
    );
    if (index === -1) {
        throw new Error(`The entity ${entity} is not registered.`);
    }

    const entityMetadata = dataSource.entityMetadatas[index];

    const output : Record<string, any> = {};
    for (let i = 0; i < entityMetadata.relations.length; i++) {
        const relation = entityMetadata.relations[i];
        const columns = relation.joinColumns.map((c) => c.propertyName);
        if (columns.length === 0) {
            continue;
        }

        const [column] = columns;

        if (!column || typeof where[column] === 'undefined') {
            continue;
        }

        const repository = dataSource.getRepository(relation.type);
        const entity = await repository.findOne({
            where: {
                id: where[column],
            },
        });

        if (!entity) {
            throw new BadRequestError(buildRequestValidationErrorMessage(column));
        }

        output[relation.propertyName] = entity;
    }

    return output as EntityRelations<T>;
}
