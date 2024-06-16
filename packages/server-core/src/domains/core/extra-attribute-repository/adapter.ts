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
    BaseExtraAttributeEntity, ExtraAttributeRepositoryExtraPropertyFn,
    ExtraAttributesOptions,
    ExtraAttributesRepositoryAdapterContext,
} from './types';

export class ExtraAttributesRepositoryAdapter<
    T,
    A extends BaseExtraAttributeEntity,
> {
    protected repository : Repository<T>;

    public primaryColumn : keyof T;

    protected attributeRepository : Repository<A>;

    public attributeForeignColumn : keyof A;

    protected cachePrefix?: string;

    protected extraPropertiesFn : ExtraAttributeRepositoryExtraPropertyFn<T, A> | undefined;

    // ------------------------------------------------------------------------------

    constructor(ctx: ExtraAttributesRepositoryAdapterContext<T, A>) {
        this.extraPropertiesFn = ctx.extraProperties;
        this.repository = ctx.repository;
        this.primaryColumn = ctx.primaryColumn;
        this.attributeRepository = ctx.attributeRepository;
        this.attributeForeignColumn = ctx.attributeForeignColumn;
        this.cachePrefix = ctx.cachePrefix;
    }

    // ------------------------------------------------------------------------------

    async findOneWithExtraAttributes(
        options: FindOneOptions<T>,
        extraOptions: ExtraAttributesOptions = {},
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
        extraOptions: ExtraAttributesOptions = {},
    ) : Promise<(T & E)[]> {
        const entities = await this.repository.find(options);

        return this.findAndAppendExtraAttributesToMany(entities, extraOptions);
    }

    // todo: option to keep removable attributes
    async saveWithAttributes<E extends Record<string, any>>(
        input: T & E,
        attributes?: E,
    ) : Promise<T & E> {
        const internalProperties = this.repository.metadata.columns.map(
            (column) => column.propertyName,
        );

        let extra : Record<string, any> = {};
        if (attributes) {
            extra = {
                ...attributes,
            };
        }

        const keys = Object.keys(input) as (keyof T)[];
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i] as string;
            const index = internalProperties.indexOf(key);
            if (index === -1) {
                extra[key] = input[key];
                delete input[key];
            }
        }

        await this.repository.save(input);

        await this.saveExtraAttributes(
            input,
            extra,
        );

        const extraKeys = Object.keys(extra);
        for (let i = 0; i < extraKeys.length; i++) {
            input[extraKeys[i] as keyof T] = extra[extraKeys[i]];
        }

        return input;
    }

    async findExtraAttributesByPrimaryColumn<E extends Record<string, any>>(
        value: T[keyof T],
        extraOptions: ExtraAttributesOptions = {},
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
                    id: value as string,
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
        extraOptions: ExtraAttributesOptions = {},
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
        extraOptions: ExtraAttributesOptions = {},
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
    ) {
        let properties : Partial<A> = {};
        if (this.extraPropertiesFn) {
            properties = await this.extraPropertiesFn(parent);
        }

        const key = this.attributeForeignColumn as keyof A;

        properties[key as keyof A] = parent[this.primaryColumn] as any;

        const where : Partial<A> = {};
        where[key] = parent[this.primaryColumn] as any;

        const items = await this.attributeRepository.findBy(where);

        const itemsToDelete : A[] = [];
        const itemsToUpdate : A[] = [];

        const keysProcessed : string[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (hasOwnProperty(input, item.name)) {
                item.value = input[item.name];

                itemsToUpdate.push({
                    ...item,
                    ...properties,
                });

                keysProcessed.push(item.name);
            } else {
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
                itemsToAdd.push({
                    ...properties,
                    name: keys[i],
                    value: input[keys[i]],
                } as A);
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
