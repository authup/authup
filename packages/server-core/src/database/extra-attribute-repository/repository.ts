/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    DataSource, EntityManager, FindManyOptions, FindOneOptions,
} from 'typeorm';
import { InstanceChecker, Repository } from 'typeorm';
import { ExtraAttributesRepositoryAdapter } from './adapter';
import type {
    EARepositoryEntityBase, EARepositoryFindOptions, EARepositoryOptions, EARepositorySaveOptions,
} from './types';

export class EARepository<
    T,
    A extends EARepositoryEntityBase,
> extends Repository<T> {
    protected adapter : ExtraAttributesRepositoryAdapter<T, A>;

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

        this.adapter = new ExtraAttributesRepositoryAdapter<T, A>({
            ...ctx,
            repository: this,
            attributeRepository: this.manager.getRepository(attributeEntity),
        });
    }

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

    async saveWithAttributes<E extends Record<string, any>>(
        input: T & E,
        attributes?: E,
        options?: EARepositorySaveOptions<T>,
    ) : Promise<T & E> {
        return this.adapter.saveWithAttributes(input, attributes, options);
    }

    async findExtraAttributesByPrimaryColumn<E extends Record<string, any>>(
        value: T[keyof T],
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<E> {
        return this.adapter.findExtraAttributesByPrimaryColumn(value, extraOptions);
    }

    async findAndAppendExtraAttributesTo<E extends Record<string, any>>(
        entity: T,
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<T & E> {
        return this.adapter.findAndAppendExtraAttributesTo(entity, extraOptions);
    }

    async findAndAppendExtraAttributesToMany<E extends Record<string, any>>(
        entities: T[],
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<(T & E)[]> {
        return this.adapter.findAndAppendExtraAttributesToMany(entities, extraOptions);
    }
}
