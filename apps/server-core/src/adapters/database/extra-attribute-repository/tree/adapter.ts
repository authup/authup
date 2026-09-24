/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { EntityManager } from 'typeorm';
import { ExtraAttributesRepositoryAdapter } from '../adapter.ts';
import type { EARepositoryEntityBase, EARepositoryFindOptions, EARepositorySaveOptions } from '../types.ts';

export class ExtraAttributesTreeRepositoryAdapter<
    T extends ObjectLiteral = ObjectLiteral,
    A extends EARepositoryEntityBase = EARepositoryEntityBase,
> extends ExtraAttributesRepositoryAdapter<T, A> {
    protected override async saveWithEAIn<E extends Record<string, any>>(
        manager: EntityManager,
        input: T & E,
        attributes?: E,
        options?: EARepositorySaveOptions<T>,
    ) : Promise<T & E> {
        const childColumnName = this.repository.metadata.treeChildrenRelation?.propertyName;
        const parentColumnName = this.repository.metadata.treeParentRelation?.propertyName;

        let children : T | T[] | undefined;

        if (childColumnName && input[childColumnName]) {
            children = input[childColumnName];
            delete input[childColumnName];
        }

        if (
            parentColumnName &&
            options &&
            options.parent
        ) {
            input[parentColumnName as keyof T] = options.parent as (T & E)[keyof T];
        }

        await super.saveWithEAIn(manager, input, attributes, options);

        if (
            parentColumnName &&
            options &&
            options.parent
        ) {
            delete input[parentColumnName as keyof T];
        }

        if (
            childColumnName &&
            parentColumnName &&
            children
        ) {
            if (Array.isArray(children)) {
                for (const child of children) {
                    await this.saveWithEAIn(manager, child, undefined, {
                        ...(options || {}),
                        parent: input,
                    });
                }
            } else {
                await this.saveWithEAIn(manager, children, undefined, {
                    ...(options || {}),
                    parent: input,
                });
            }

            input[childColumnName as keyof T] = children as (T & E)[keyof T];
        }

        return input;
    }

    // ------------------------------------------------------------------------------

    async extendManyWithEA<E extends Record<string, any>>(
        entities: T[],
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<(T & E)[]> {
        const flattened = this.flatten(entities);

        const attributesByPrimaryKey = await this.findWithEAByPrimaryColumn(
            this.getPrimaryKeyValues(flattened),
            extraOptions,
        );

        this.traverse(entities, (entity) => {
            const value = attributesByPrimaryKey[entity[this.primaryColumn] as string];
            if (!value) {
                return entity;
            }

            const keys = Object.keys(value);
            for (const key of keys) {
                entity[key as keyof T] = value[key] as T[keyof T];
            }

            return entity;
        });

        return entities as (T & E)[];
    }

    // ------------------------------------------------------------------------------

    protected flatten(entities: T | T[]) : T[] {
        const output : T[] = [];

        this.traverse(entities, (entity) => {
            output.push(entity);

            return entity;
        });

        return output;
    }

    protected traverse(entities: T | T[], fn: (entity: T) => T) {
        const data : T[] = Array.isArray(entities) ? entities : [entities];

        const childColumnName = this.repository.metadata.treeChildrenRelation?.propertyName;
        for (const datum of data) {
            fn(datum);

            if (childColumnName && datum[childColumnName]) {
                if (Array.isArray(datum[childColumnName])) {
                    this.traverse(datum[childColumnName], fn);
                } else {
                    this.traverse([datum[childColumnName]], fn);
                }
            }
        }
    }
}
