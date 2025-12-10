/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import { ExtraAttributesRepositoryAdapter } from '../adapter';
import type { EARepositoryEntityBase, EARepositoryFindOptions, EARepositorySaveOptions } from '../types';

export class ExtraAttributesTreeRepositoryAdapter<
    T extends ObjectLiteral = ObjectLiteral,
    A extends EARepositoryEntityBase = EARepositoryEntityBase,
> extends ExtraAttributesRepositoryAdapter<T, A> {
    async saveWithEA<E extends Record<string, any>>(
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

        await super.saveWithEA(input, attributes, options);

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
                for (let i = 0; i < children.length; i++) {
                    await this.saveWithEA(children[i], undefined, {
                        ...(options || {}),
                        parent: input,
                    });
                }
            } else {
                await this.saveWithEA(children, undefined, {
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
            for (let i = 0; i < keys.length; i++) {
                entity[keys[i] as keyof T] = value[keys[i]] as T[keyof T];
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
        for (let i = 0; i < data.length; i++) {
            fn(data[i]);

            if (childColumnName && data[i][childColumnName]) {
                if (Array.isArray(data[i][childColumnName])) {
                    this.traverse(data[i][childColumnName], fn);
                } else {
                    this.traverse([data[i][childColumnName]], fn);
                }
            }
        }
    }
}
