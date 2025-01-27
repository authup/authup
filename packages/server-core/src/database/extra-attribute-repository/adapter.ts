/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@authup/kit';
import { buildRedisKeyPath } from '@authup/server-kit';
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
    T,
    A extends EARepositoryEntityBase,
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

    async findOneWithExtraAttributes(
        options: FindOneOptions<T>,
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<T | undefined> {
        const entity = await this.repository.findOne(options);
        if (!entity) {
            return undefined;
        }

        await this.findAndAppendExtraAttributesTo(entity, extraOptions);

        return entity;
    }

    async findWithExtraAttributes<
        E extends Record<string, any>,
    >(
        options: FindManyOptions<T>,
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<(T & E)[]> {
        const entities = await this.repository.find(options);

        return this.findAndAppendExtraAttributesToMany(entities, extraOptions);
    }

    async saveWithAttributes<E extends Record<string, any>>(
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

        const childColumnName = this.repository.metadata.treeChildrenRelation?.propertyName;
        const parentColumnName = this.repository.metadata.treeParentRelation?.propertyName;

        let children : T | T[] | undefined;

        if (
            childColumnName &&
            parentColumnName
        ) {
            if (input[childColumnName]) {
                children = input[childColumnName];
                delete input[childColumnName];
            }

            if (options && options.parent) {
                input[parentColumnName as keyof T] = options.parent as (T & E)[keyof T];
            }
        }

        await this.repository.save(input);

        if (
            childColumnName &&
            parentColumnName &&
            children
        ) {
            if (Array.isArray(children)) {
                for (let i = 0; i < children.length; i++) {
                    await this.saveWithAttributes(children[i], undefined, {
                        ...(options || {}),
                        parent: input,
                    });
                }
            } else {
                await this.saveWithAttributes(children, undefined, {
                    ...(options || {}),
                    parent: input,
                });
            }

            input[childColumnName as keyof T] = children as (T & E)[keyof T];
        }

        await this.saveExtraAttributes(
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

    async findExtraAttributesByPrimaryColumn<E extends Record<string, any>>(
        value: T[keyof T],
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<E> {
        const where : FindOptionsWhere<A> = {};
        where[this.attributeForeignColumn as keyof FindOptionsWhere<A>] = value as any;
        if (extraOptions.attributes) {
            where.name = In(extraOptions.attributes) as FindOptionsWhereProperty<A['name']>;
        }

        let cache : { id: string, milliseconds: number } | undefined;
        if (this.cachePrefix) {
            cache = {
                id: buildRedisKeyPath({
                    prefix: this.cachePrefix,
                    key: value as string,
                }),
                milliseconds: 60.000,
            };
        }

        const entities = await this.attributeRepository.find({ where, cache });

        const output : Record<string, any> = {};
        for (let i = 0; i < entities.length; i++) {
            output[entities[i].name] = entities[i].value;
        }

        return output as E;
    }

    async findAndAppendExtraAttributesTo<E extends Record<string, any>>(
        entity: T,
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<T & E> {
        const attributes = await this.findExtraAttributesByPrimaryColumn(
            entity[this.primaryColumn],
            extraOptions,
        );

        const attributeKeys = Object.keys(attributes);
        for (let i = 0; i < attributeKeys.length; i++) {
            entity[attributeKeys[i]] = attributes[attributeKeys[i]];
        }

        return entity as T & E;
    }

    async findAndAppendExtraAttributesToMany<E extends Record<string, any>>(
        entities: T[],
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<(T & E)[]> {
        const ids = entities.map((entity) => entity[this.primaryColumn]);

        const where : FindOptionsWhere<A> = {};
        where[this.attributeForeignColumn as keyof FindOptionsWhere<A>] = In(ids) as any;
        if (extraOptions.attributes) {
            where.name = In(extraOptions.attributes) as FindOptionsWhereProperty<A['name']>;
        }

        const attributes = await this.attributeRepository.find({ where });

        for (let i = 0; i < entities.length; i++) {
            const entityAttributes = attributes.filter(
                (attribute) => attribute[this.attributeForeignColumn] === entities[i][this.primaryColumn] as unknown as A[keyof A],
            );
            this.assignExtraAttributesTo(entities[i], entityAttributes);
        }

        return entities as (T & E)[];
    }

    // ------------------------------------------------------------------------------

    private async saveExtraAttributes(
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

    private assignExtraAttributesTo(entity: T, data: A[]) : Record<string, any> {
        for (let i = 0; i < data.length; i++) {
            entity[data[i].name as keyof T] = data[i].value;
        }

        return entity;
    }
}
