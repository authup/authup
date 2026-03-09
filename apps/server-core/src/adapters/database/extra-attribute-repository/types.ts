/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { ObjectLiteral } from '@authup/kit';
import type { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import type { EntityTarget } from 'typeorm/common/EntityTarget.js';

export type EARepositoryOptions<
    T,
    A,
> = {
    cachePrefix?: string,

    entity: EntityTarget<T>,
    entityPrimaryColumn: keyof T,

    attributeEntity: EntityTarget<A>,
    attributeForeignColumn: keyof A,
    attributeProperties?: EARepositoryPropertiesModifyFn<T, A>
};

export type EARepositoryEntityBase = {
    name: string,
    value: any,
    [key: string]: any
};

export type EARepositoryPropertiesModifyFn<T, A> = (input: A, parent: T) => A;

export type EARepositoryAdapterOptions<
    T extends ObjectLiteral = ObjectLiteral,
    A extends EARepositoryEntityBase = EARepositoryEntityBase,
> = Omit<EARepositoryOptions<T, A>, 'entity' | 'attributeEntity'> & {
    repository: Repository<T>,
    attributeRepository: Repository<A>
};

export type EARepositoryFindOptions = {
    attributes?: string[],
    withTreeDescendents?: boolean
};

export type EARepositorySaveOptions<T> = {
    /**
     * Don't delete non passed attributes.
     */
    keepAll?: boolean,

    parent?: T
};

export interface IEARepository<T > {
    saveOneWithEA<E extends Record<string, any>>(
        input: T & E,
        attributes?: E,
        options?: EARepositorySaveOptions<T>,
    ) : Promise<T & E>;

    // ------------------------------------------------------------------------------

    findOneWithEAByPrimaryColumn<E extends Record<string, any>>(
        value: T[keyof T],
        extraOptions?: EARepositoryFindOptions,
    ) : Promise<E>;

    findOneWithEA(
        options: FindOneOptions<T>,
        extraOptions?: EARepositoryFindOptions,
    ) : Promise<T | undefined>;

    findManyWithEA<
        E extends Record<string, any>,
    >(
        options: FindManyOptions<T>,
        extraOptions?: EARepositoryFindOptions,
    ) : Promise<(T & E)[]>;

    // ------------------------------------------------------------------------------

    extendOneWithEA<E extends Record<string, any>>(
        entity: T,
        extraOptions?: EARepositoryFindOptions,
    ) : Promise<T & E>;

    extendManyWithEA<E extends Record<string, any>>(
        entities: T[],
        extraOptions?: EARepositoryFindOptions,
    ) : Promise<(T & E)[]>;
}
