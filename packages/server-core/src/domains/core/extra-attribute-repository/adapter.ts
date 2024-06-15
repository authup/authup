/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@authup/kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { clone } from 'smob';
import type {
    FindManyOptions,
    FindOneOptions,
    FindOptionsWhere,
    FindOptionsWhereProperty,
    Repository,
} from 'typeorm';
import { In } from 'typeorm';
import type {
    BaseExtraAttributeEntity,
    ExtraAttributesOptions,
    ExtraAttributesRepositoryAdapterContext,
} from './types';

export class ExtraAttributesRepositoryAdapter<
    T,
    A extends BaseExtraAttributeEntity,
> {
    protected repository : Repository<T>;

    protected primaryColumn : keyof T;

    protected attributeRepository : Repository<A>;

    protected attributeForeignColumn : keyof A;

    protected cachePrefix?: string;

    // ------------------------------------------------------------------------------

    constructor(ctx: ExtraAttributesRepositoryAdapterContext<T, A>) {
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
        const cloned = clone(input);

        const internalProperties = this.repository.metadata.columns.map(
            (column) => column.propertyName,
        );

        const internal : T = {} as T;
        const extra : Record<string, any> = {};

        const keys = Object.keys(cloned) as (keyof T)[];
        for (let i = 0; i < keys.length; i++) {
            const index = internalProperties.indexOf(keys[i] as string);
            if (index === -1) {
                extra[keys[i] as string] = cloned[keys[i]];
            } else {
                internal[keys[i]] = cloned[keys[i]];
            }
        }

        await this.repository.save(internal);

        const internalKeys = Object.keys(internal);
        for (let i = 0; i < internalKeys.length; i++) {
            input[internalKeys[i] as keyof T] = internal[internalKeys[i]];
        }

        await this.saveExtraAttributes({
            [this.attributeForeignColumn]: input[this.primaryColumn] as unknown as A[keyof A],
        } as Partial<A>, {
            ...extra,
            ...(attributes || {}),
        });

        if (attributes) {
            const attributeKeys = Object.keys(attributes);
            for (let i = 0; i < attributeKeys.length; i++) {
                input[attributeKeys[i] as keyof T] = attributes[attributeKeys[i]];
            }
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
        condition: Partial<A>,
        input: Record<string, any>,
    ) {
        const itemsExist = await this.attributeRepository.findBy(condition);
        const itemsToDelete : A[] = [];

        for (let i = 0; i < itemsExist.length; i++) {
            if (hasOwnProperty(input, itemsExist[i].name)) {
                itemsExist[i].value = input[itemsExist[i].name];
                delete input[itemsExist[i].name];
            } else {
                itemsToDelete.push(itemsExist[i]);
            }
        }

        await this.attributeRepository.save(itemsExist);

        if (itemsToDelete.length > 0) {
            await this.attributeRepository.remove(itemsToDelete);
        }

        const itemsToAdd = this.transformRecordToArray(input, condition);
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

    private transformRecordToArray(
        data: Record<string, any>,
        extra?: Partial<A>,
    ) : A[] {
        const entities : A[] = [];

        const keys = Object.keys(data);
        for (let i = 0; i < keys.length; i++) {
            entities.push({
                ...(extra || {}),
                name: keys[i],
                value: data[keys[i]],
            } as A);
        }

        return entities as A[];
    }
}
