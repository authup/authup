/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    DataSource, EntityManager, FindManyOptions, FindOneOptions,
} from 'typeorm';
import {
    InstanceChecker,
    TreeRepository,
} from 'typeorm';
import { ExtraAttributesRepositoryAdapter } from './adapter';
import type {
    EARepositoryEntityBase, EARepositoryFindOptions, EARepositoryOptions, EARepositorySaveOptions,
} from './types';

// todo: tree walk children (find, save, ...)
export class EATreeRepository<
    T,
    A extends EARepositoryEntityBase,
> extends TreeRepository<T> {
    protected adapter : ExtraAttributesRepositoryAdapter<T, A>;

    protected options: EARepositoryOptions<T, A>;

    constructor(
        instance: DataSource | EntityManager,
        options: EARepositoryOptions<T, A>,
    ) {
        const {
            entity,
            attributeEntity,
            ...ctx
        } = options;

        super(
            entity,
            InstanceChecker.isDataSource(instance) ? instance.manager : instance,
        );

        this.options = options;
        this.adapter = new ExtraAttributesRepositoryAdapter<T, A>({
            ...ctx,
            repository: this,
            attributeRepository: this.manager.getRepository(attributeEntity),
        });
    }

    // ------------------------------------------------------------------------------

    async saveWithAttributes<E extends Record<string, any>>(
        input: T & E,
        attributes?: E,
        options?: EARepositorySaveOptions<T>,
    ) : Promise<T & E> {
        return this.adapter.saveWithAttributes(input, attributes, options);
    }

    // ------------------------------------------------------------------------------

    async findOneWithAttributes(
        options: FindOneOptions<T>,
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<T | undefined> {
        return this.adapter.findOneWithExtraAttributes(options, extraOptions);
    }

    async findWithAttributes<
        E extends Record<string, any>,
    >(
        options: FindManyOptions<T>,
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<(T & E)[]> {
        return this.adapter.findWithExtraAttributes(options, extraOptions);
    }

    // ------------------------------------------------------------------------------

    async extendWithExtraAttributes<E extends Record<string, any>>(
        entity: T,
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<T & E> {
        const [output] = await this.extendManyWithExtraAttributes([entity], extraOptions);

        return output as (T & E);
    }

    async extendManyWithExtraAttributes<E extends Record<string, any>>(
        entities: T[],
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<(T & E)[]> {
        const flattened = this.flatten(entities);

        const attributesByPrimaryKey = await this.adapter.findExtraAttributesForPrimaryKeys(
            this.adapter.getPrimaryKeyValues(flattened),
            extraOptions,
        );

        this.traverse(entities, (entity) => {
            const value = attributesByPrimaryKey[entity[this.options.entityPrimaryColumn] as string];
            if (!value) {
                return entity;
            }

            const keys = Object.keys(value);
            for (let i = 0; i < keys.length; i++) {
                entity[keys[i]] = value[keys[i]];
            }

            return entity;
        });

        return entities as (T & E)[];
    }

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

        const childColumnName = this.metadata.treeChildrenRelation?.propertyName;
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
