/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Repository } from 'typeorm';
import type { EntityTarget } from 'typeorm/common/EntityTarget';

export type ExtraAttributeRepositoryOptions<
    T,
    A,
> = {
    cachePrefix?: string,

    entity: EntityTarget<T>,
    entityPrimaryColumn: keyof T,

    attributeEntity: EntityTarget<A>,
    attributeForeignColumn: keyof A,
    attributeExtraProperties?: ExtraAttributeRepositoryExtraPropertyFn<T, A>
};

export type BaseExtraAttributeEntity = {
    name: string,
    value: any,
    [key: string]: any
};

export type ExtraAttributesOptions = {
    attributes?: string[]
};

export type ExtraAttributeRepositoryExtraPropertyFn<T, A> = (input: T) => Promise<Partial<A>>;

export type ExtraAttributesRepositoryAdapterContext<
    T,
    A extends BaseExtraAttributeEntity,
> = {
    cachePrefix?: string,

    repository: Repository<T>;
    primaryColumn : keyof T;

    attributeRepository: Repository<A>;
    attributeForeignColumn: keyof A;

    extraProperties?: ExtraAttributeRepositoryExtraPropertyFn<T, A>
};
