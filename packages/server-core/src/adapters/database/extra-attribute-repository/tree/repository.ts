/*
 * Copyright (c) 2024-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    DataSource, EntityManager, FindManyOptions, FindOneOptions, FindTreeOptions,
    SelectQueryBuilder,
} from 'typeorm';
import {
    FindOptionsUtils,
    InstanceChecker,
    TreeRepository, TreeRepositoryUtils,
} from 'typeorm';
import type { ObjectLiteral } from '@authup/kit';
import type { ExtraAttributesRepositoryAdapter } from '../adapter';
import type {
    EARepositoryEntityBase, EARepositoryFindOptions, EARepositoryOptions, EARepositorySaveOptions, IEARepository,
} from '../types';
import { ExtraAttributesTreeRepositoryAdapter } from './adapter';

/**
 * @see https://github.com/typeorm/typeorm/blob/master/src/repository/TreeRepository.ts
 */
export class EATreeRepository<
    T extends ObjectLiteral = ObjectLiteral,
    A extends EARepositoryEntityBase = EARepositoryEntityBase,
> extends TreeRepository<T> implements IEARepository<T> {
    protected adapter: ExtraAttributesRepositoryAdapter<T, A>;

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
        this.adapter = new ExtraAttributesTreeRepositoryAdapter<T, A>({
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
    ): Promise<T & E> {
        return this.adapter.saveWithEA(input, attributes, options);
    }

    // ------------------------------------------------------------------------------

    async findOneWithEA(
        options: FindOneOptions<T>,
        extraOptions: EARepositoryFindOptions = {},
    ): Promise<T | undefined> {
        return this.adapter.findOneWithEA(options, extraOptions);
    }

    async findOneWithEAByPrimaryColumn<E extends Record<string, any>>(
        value: T[keyof T],
        extraOptions?: EARepositoryFindOptions,
    ): Promise<E> {
        return this.adapter.findOneWithEAByPrimaryColumn(value, extraOptions);
    }

    async findManyWithEA<
        E extends Record<string, any>,
    >(
        options: FindManyOptions<T>,
        extraOptions: EARepositoryFindOptions = {},
    ): Promise<(T & E)[]> {
        return this.adapter.findWithEA(options, extraOptions);
    }

    // ------------------------------------------------------------------------------

    async extendOneWithEA<E extends Record<string, any>>(
        entity: T,
        extraOptions: EARepositoryFindOptions = {},
    ): Promise<T & E> {
        const [output] = await this.extendManyWithEA([entity], extraOptions);

        return output as (T & E);
    }

    async extendManyWithEA<E extends Record<string, any>>(
        entities: T[],
        extraOptions: EARepositoryFindOptions = {},
    ): Promise<(T & E)[]> {
        return this.adapter.extendManyWithEA(entities, extraOptions);
    }

    // -------------------------------------------------------------------------------

    async findRoots(options?: FindTreeOptions): Promise<T[]> {
        const entities = await super.findRoots(options);

        await this.extendManyWithEA(entities);

        return entities;
    }

    async findDescendantsTree(
        entity: T,
        options?: FindTreeOptions,
    ): Promise<T> {
        const qb: SelectQueryBuilder<T> = this.createDescendantsQueryBuilder(
            'treeEntity',
            'treeClosure',
            entity,
        );
        FindOptionsUtils.applyOptionsToTreeQueryBuilder(qb, options);

        const entities = await qb.getRawAndEntities();
        const relationMaps = TreeRepositoryUtils.createRelationMaps(
            this.manager,
            this.metadata,
            'treeEntity',
            entities.raw,
        );

        await this.extendManyWithEA(entities.entities);

        TreeRepositoryUtils.buildChildrenEntityTree(
            this.metadata,
            entity,
            entities.entities,
            relationMaps,
            {
                depth: -1,
                ...options,
            },
        );

        return entity;
    }

    async findAncestors(
        entity: T,
        options?: FindTreeOptions,
    ): Promise<T[]> {
        const entities = await super.findAncestors(entity, options);

        await this.extendManyWithEA(entities);

        return entities;
    }

    // -------------------------------------------------------------------------------

    async findAncestorsTree(
        entity: T,
        options?: FindTreeOptions,
    ): Promise<T> {
        const qb = this.createAncestorsQueryBuilder(
            'treeEntity',
            'treeClosure',
            entity,
        );
        FindOptionsUtils.applyOptionsToTreeQueryBuilder(qb, options);

        const entities = await qb.getRawAndEntities();
        const relationMaps = TreeRepositoryUtils.createRelationMaps(
            this.manager,
            this.metadata,
            'treeEntity',
            entities.raw,
        );

        await this.extendManyWithEA(entities.entities);

        TreeRepositoryUtils.buildParentEntityTree(
            this.metadata,
            entity,
            entities.entities,
            relationMaps,
        );
        return entity;
    }

    // -------------------------------------------------------------------------------

    async updateClosureTable(entity: T) {
        const primaryKeyValue = this.metadata.primaryColumns[0].getEntityValue(entity);
        if (!primaryKeyValue) {
            return;
        }

        const closureTable = this.metadata.closureJunctionTable;
        if (!closureTable) {
            return;
        }

        const { tableName } = this.metadata.closureJunctionTable;
        const ancestorColumn = this.metadata.closureJunctionTable.ancestorColumns[0];
        const descendantColumn = this.metadata.closureJunctionTable.descendantColumns[0];

        await this.manager.connection.transaction(async (manager) => {
            // 1. Get All ancestors of current entity
            const ancestors = await manager.query<Record<string, any>[]>(
                `Select *
                     FROM ${tableName}
                     WHERE ${ancestorColumn.databasePath} != ${descendantColumn.databasePath} AND
                           ${descendantColumn.databasePath} = '${primaryKeyValue}' AND
                           ${ancestorColumn.databasePath} != '${primaryKeyValue}';`,
            );

            if (!this.metadata.treeParentRelation) {
                return;
            }

            const parentId = this.metadata.treeParentRelation.joinColumns[0].getEntityValue(entity);

            let ancestorIds : string[];
            if (parentId) {
                ancestorIds = [
                    parentId,
                    ...ancestors
                        .filter((ancestor) => ancestor[ancestorColumn.databasePath] !== parentId)
                        .map((ancestor) => ancestor[ancestorColumn.databasePath]),
                ];
            } else {
                ancestorIds = ancestors.map((ancestor) => ancestor[ancestorColumn.databasePath]);
            }

            if (ancestorIds.length === 0) {
                return;
            }

            // 2. Get All descendants of current entity.
            const descendants = await manager.query<Record<string, any>[]>(
                `Select *
                         FROM ${tableName}
                         WHERE ${ancestorColumn.databasePath} != ${descendantColumn.databasePath} AND
                               ${ancestorColumn.databasePath} = '${primaryKeyValue}' AND
                               ${descendantColumn.databasePath} != '${primaryKeyValue}';`,
            );

            if (parentId) {
                // 3. get all descendant
                const descendantIds = descendants
                    .map((descendant) => descendant[descendantColumn.databasePath]);

                // 4. get all ancestors of each descendant :)
                const ancestorsOfDescendants = await manager.query<Record<string, any>[]>(
                    `Select *
                         FROM ${tableName}
                         WHERE
                             ${ancestorColumn.databasePath} != '${primaryKeyValue}' AND
                             ${ancestorColumn.databasePath} != ${descendantColumn.databasePath} AND
                             ${descendantColumn.databasePath} IN (${descendantIds.map((descendantId) => `'${descendantId}'`).join(',')});`,
                );

                const acc = ancestorsOfDescendants.reduce((acc, curr) => {
                    if (!acc[curr[descendantColumn.databasePath]]) {
                        acc[curr[descendantColumn.databasePath]] = [];
                    }

                    acc[curr[descendantColumn.databasePath]] = curr[ancestorColumn.databasePath];
                    return acc;
                }, {} as Record<string, string[]>);

                const accKeys = Object.keys(acc);
                // 5. Check if for each child a relation exists with each ancestor (create if not exist)
                for (let i = 0; i < accKeys.length; i++) {
                    const descendant = accKeys[i];
                    const ancestorsOfDescendent = acc[descendant];

                    for (let j = 0; j < ancestorIds.length; j++) {
                        const index = ancestorsOfDescendent.indexOf(ancestorIds[j]);
                        if (index === -1) {
                            await manager.query(`INSERT INTO
                                                    ${tableName}
                                                 (${ancestorColumn.databasePath}, ${descendantColumn.databasePath}) VALUES
                                                   ('${ancestorIds[j]}','${descendant}');`);
                        }
                    }
                }
            } else {
                const descendantIds = [
                    primaryKeyValue,
                    ...descendants.map((descendant) => descendant[descendantColumn.databasePath]),
                ];

                for (let i = 0; i < ancestorIds.length; i++) {
                    for (let j = 0; j < descendantIds.length; j++) {
                        await manager.query(`DELETE
                                                 FROM ${tableName}
                                                 WHERE ${ancestorColumn.databasePath} = '${ancestorIds[i]}'
                                                   AND ${descendantColumn.databasePath} = '${descendantIds[j]}';`);
                    }
                }
            }
        });
    }
}
