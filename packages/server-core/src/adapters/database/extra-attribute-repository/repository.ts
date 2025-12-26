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
import type { ObjectLiteral } from '@authup/kit';
import { ExtraAttributesRepositoryAdapter } from './adapter.ts';
import type {
    EARepositoryEntityBase, EARepositoryFindOptions, EARepositoryOptions, EARepositorySaveOptions, IEARepository,
} from './types.ts';

export class EARepository<
    T extends ObjectLiteral = ObjectLiteral,
    A extends EARepositoryEntityBase = EARepositoryEntityBase,
> extends Repository<T> implements IEARepository <T> {
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
    // ------------------------------------------------------------------------------

    async saveOneWithEA<E extends Record<string, any>>(
        input: T & E,
        attributes?: E,
        options?: EARepositorySaveOptions<T>,
    ) : Promise<T & E> {
        return this.adapter.saveWithEA(input, attributes, options);
    }

    // ------------------------------------------------------------------------------

    async findOneWithEA(
        options: FindOneOptions<T>,
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<T | undefined> {
        return this.adapter.findOneWithEA(options, extraOptions);
    }

    async findManyWithEA<
        E extends Record<string, any>,
    >(
        options: FindManyOptions<T>,
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<(T & E)[]> {
        return this.adapter.findWithEA(options, extraOptions);
    }

    async findOneWithEAByPrimaryColumn<E extends Record<string, any>>(
        value: T[keyof T],
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<E> {
        return this.adapter.findOneWithEAByPrimaryColumn(value, extraOptions);
    }

    async extendOneWithEA<E extends Record<string, any>>(
        entity: T,
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<T & E> {
        return this.adapter.extendWithEA(entity, extraOptions);
    }

    async extendManyWithEA<E extends Record<string, any>>(
        entities: T[],
        extraOptions: EARepositoryFindOptions = {},
    ) : Promise<(T & E)[]> {
        return this.adapter.extendManyWithEA(entities, extraOptions);
    }
}
