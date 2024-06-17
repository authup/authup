/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Repository } from 'typeorm';
import type { EntityTarget } from 'typeorm/common/EntityTarget';

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
    T,
    A extends EARepositoryEntityBase,
> = Omit<EARepositoryOptions<T, A>, 'entity' | 'attributeEntity'> & {
    repository: Repository<T>,
    attributeRepository: Repository<A>
};

export type EARepositoryFindOptions = {
    attributes?: string[]
};

export type EARepositorySaveOptions = {
    /**
     * Don't delete non passed attributes.
     */
    keepAll?: boolean
};
