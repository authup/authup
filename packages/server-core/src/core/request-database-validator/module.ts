/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@ebec/http';
import type { Request } from 'routup';
import type { DataSource, EntityMetadata, EntityTarget } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import { buildErrorMessageForAttribute } from '../../utils';
import type { RequestValidatorExecuteOptions } from '../request-validator';
import { RequestValidator } from '../request-validator';

export class RequestDatabaseValidator<
    T extends Record<string, any> = Record<string, any>,
> extends RequestValidator<T> {
    protected target : EntityTarget<T>;

    constructor(target: EntityTarget<T>) {
        super();

        this.target = target;
    }

    async execute(
        req: Request,
        options: RequestValidatorExecuteOptions<T> = {},
    ): Promise<T> {
        const result = await super.execute(req, options);

        const relations = await this.lookupRelations(result);
        const relationKeys = Object.keys(relations);
        for (let i = 0; i < relationKeys.length; i++) {
            const relationKey = relationKeys[i];

            result[relationKey as keyof T] = relations[relationKey];
        }

        return result;
    }

    protected async getFields() {
        const dataSource = await useDataSource();
        const entityMetadata = await this.getEntityMetadata(dataSource);

        const fields : string[] = entityMetadata.columns.map((c) => c.propertyName);
        for (let i = 0; i < entityMetadata.relations.length; i++) {
            fields.push(entityMetadata.relations[i].propertyName);
        }

        return fields;
    }

    protected async lookupRelations(where: Partial<T>) : Promise<Partial<T>> {
        const dataSource = await useDataSource();
        const entityMetadata = await this.getEntityMetadata(dataSource);

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
                throw new BadRequestError(buildErrorMessageForAttribute(column));
            }

            output[relation.propertyName] = entity;
        }

        return output as Partial<T>;
    }

    protected async getEntityMetadata(dataSource: DataSource) : Promise<EntityMetadata> {
        const index = dataSource.entityMetadatas.findIndex(
            (entityMetadata) => entityMetadata.target === this.target,
        );
        if (index === -1) {
            throw new Error(`The entity ${this.target} is not registered.`);
        }

        return dataSource.entityMetadatas[index];
    }
}
