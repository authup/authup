/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import { hasOwnProperty } from '@authup/kit';
import type {
    FindManyOptions,
    FindOneOptions,
    FindOptionsWhere,
    FindOptionsWhereProperty,
    Repository,
} from 'typeorm';
import { In } from 'typeorm';
import type {
    EARepositoryAdapterOptions,
    EARepositoryEntityBase,
    EARepositoryFindOptions,
    EARepositoryPropertiesModifyFn,
    EARepositorySaveOptions,
} from './types';

export class ExtraAttributesRepositoryAdapter<
    T extends ObjectLiteral = ObjectLiteral,
    A extends EARepositoryEntityBase = EARepositoryEntityBase,
> {
    protected repository : Repository<T>;

    public primaryColumn : keyof T;

    protected attributeRepository : Repository<A>;

    public attributeForeignColumn : keyof A;

    protected cachePrefix?: string;

    protected extra : EARepositoryPropertiesModifyFn<T, A>;

    // ------------------------------------------------------------------------------

    constructor(ctx: EARepositoryAdapterOptions<T, A>) {
        let extra : EARepositoryPropertiesModifyFn<T, A>;
        if (ctx.attributeProperties) {
            extra = ctx.attributeProperties;
        } else {
            extra = (input) => input;
        }
        this.extra = extra;

        this.repository = ctx.repository;
        this.primaryColumn = ctx.entityPrimaryColumn;
        this.attributeRepository = ctx.attributeRepository;
        this.attributeForeignColumn = ctx.attributeForeignColumn;
        this.cachePrefix = ctx.cachePrefix;
    }

    // ------------------------------------------------------------------------------

    async findOneWithEA(
        options: FindOneOptions<T>,
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<T | undefined> {
        const entity = await this.repository.findOne(options);
        if (!entity) {
            return undefined;
        }

        await this.extendWithEA(entity, extraOptions);

        return entity;
    }

    async findWithEA<
        E extends Record<string, any>,
    >(
        options: FindManyOptions<T>,
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<(T & E)[]> {
        const entities = await this.repository.find(options);

        return this.extendManyWithEA(entities, extraOptions);
    }

    async saveWithEA<E extends Record<string, any>>(
        input: T & E,
        attributes?: E,
        options?: EARepositorySaveOptions<T>,
    ) : Promise<T & E> {
        const columns : string[] = [];

        for (let i = 0; i < this.repository.metadata.columns.length; i++) {
            columns.push(this.repository.metadata.columns[i].propertyName);
        }
        for (let i = 0; i < this.repository.metadata.relations.length; i++) {
            columns.push(this.repository.metadata.relations[i].propertyName);
        }

        let extra : Record<string, any> = {};
        if (attributes) {
            extra = {
                ...attributes,
            };
        }

        const keys = Object.keys(input) as (keyof T)[];
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i] as string;
            const index = columns.indexOf(key);
            if (index === -1) {
                extra[key] = input[key];
                delete input[key];
            }
        }

        await this.repository.save(input);

        await this.saveEA(
            input,
            extra,
            options,
        );

        const extraKeys = Object.keys(extra);
        for (let i = 0; i < extraKeys.length; i++) {
            input[extraKeys[i] as keyof T] = extra[extraKeys[i]];
        }

        return input;
    }

    async findOneWithEAByPrimaryColumn<E extends Record<string, any>>(
        value: T[keyof T],
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<E> {
        const attributesByPrimary = await this.findWithEAByPrimaryColumn([value], extraOptions);
        return (attributesByPrimary[value as string] || {}) as E;
    }

    async extendWithEA<E extends Record<string, any>>(
        entity: T,
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<T & E> {
        const attributes = await this.findOneWithEAByPrimaryColumn(entity[this.primaryColumn], extraOptions);
        const attributeKeys = Object.keys(attributes);
        for (let i = 0; i < attributeKeys.length; i++) {
            const attributeKey = attributeKeys[i];
            entity[attributeKey as keyof T] = attributes[attributeKey] as T[keyof T];
        }

        return entity as T & E;
    }

    async findWithEAByPrimaryColumn<E extends Record<string, any>>(
        value: (T[keyof T])[],
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<Record<string, E>> {
        const where : FindOptionsWhere<A> = {};
        where[this.attributeForeignColumn as keyof FindOptionsWhere<A>] = In(value) as any;
        if (extraOptions.attributes) {
            where.name = In(extraOptions.attributes) as FindOptionsWhereProperty<A['name']>;
        }

        const attributes = await this.attributeRepository.find({ where });
        const output : Record<string, E> = {};

        for (let i = 0; i < value.length; i++) {
            const entityAttributes = attributes.filter(
                (attribute) => attribute[this.attributeForeignColumn] === value[i] as unknown as A[keyof A],
            );

            output[value[i] as string] = entityAttributes
                .reduce((acc, curr) => {
                    acc[curr.name as keyof E] = curr.value as E[keyof E];

                    return acc;
                }, {} as E);
        }

        return output;
    }

    async extendManyWithEA<E extends Record<string, any>>(
        entities: T[],
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<(T & E)[]> {
        const attributesByPrimaryKey = await this.findWithEAByPrimaryColumn(
            this.getPrimaryKeyValues(entities),
            extraOptions,
        );

        for (let i = 0; i < entities.length; i++) {
            const attributes = attributesByPrimaryKey[entities[i][this.primaryColumn] as string];
            if (!attributes) {
                continue;
            }

            const attributeKeys = Object.keys(attributes);
            for (let j = 0; j < attributeKeys.length; j++) {
                const attributeKey = attributeKeys[j];
                entities[i][attributeKey as keyof T] = attributes[attributeKey] as T[keyof T];
            }
        }

        return entities as (T & E)[];
    }

    // ------------------------------------------------------------------------------

    private async saveEA(
        parent: T,
        input: Record<string, any>,
        options: EARepositorySaveOptions<T> = {},
    ) {
        const foreignColumn = this.attributeForeignColumn as keyof A;
        const foreignColumnValue = parent[this.primaryColumn] as unknown as A[keyof A];

        const where : Partial<A> = {};
        where[foreignColumn] = foreignColumnValue;

        const items = await this.attributeRepository.findBy(where);

        const itemsToDelete : A[] = [];
        const itemsToUpdate : A[] = [];

        const keysProcessed : string[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (hasOwnProperty(input, item.name)) {
                item.value = input[item.name];
                item[foreignColumn] = foreignColumnValue;

                itemsToUpdate.push(this.extra(item, parent));

                keysProcessed.push(item.name);
            } else if (!options.keepAll) {
                itemsToDelete.push(items[i]);
            }
        }

        if (itemsToUpdate.length > 0) {
            await this.attributeRepository.save(itemsToUpdate);
        }

        if (itemsToDelete.length > 0) {
            await this.attributeRepository.remove(itemsToDelete);
        }

        const itemsToAdd : A[] = [];

        const keys = Object.keys(input);
        let keyIndex : number;

        for (let i = 0; i < keys.length; i++) {
            keyIndex = keysProcessed.indexOf(keys[i]);
            if (keyIndex === -1) {
                itemsToAdd.push(this.extra({
                    name: keys[i],
                    value: input[keys[i]],
                    [foreignColumn]: foreignColumnValue,
                } as A, parent));
            }
        }

        if (itemsToAdd.length > 0) {
            await this.attributeRepository.insert(itemsToAdd);
        }
    }

    getPrimaryKeyValues(entities: T[]) : T[keyof T][] {
        return entities.map((entity) => entity[this.primaryColumn as keyof T]);
    }
}
