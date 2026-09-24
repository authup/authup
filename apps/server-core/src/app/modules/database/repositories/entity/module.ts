/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';
import { EntityConflictError } from '@authup/errors';
import type { IQuery } from '@rapiq/core';
import type { EntityRepositoryFindManyResult, IEntityRepository } from '@authup/server-kit';
import type {
    DeepPartial,
    ObjectLiteral,
    Repository,
    SelectQueryBuilder,
} from 'typeorm';
import { validateEntityJoinColumns } from 'typeorm-extension';
import { isUniqueConstraintDatabaseError } from '../../../../../adapters/database/errors/index.ts';
import {
    applyJunctionRealmScopeSelect,
    hasUnmatchableId,
    isEntityUnique,
    translateWhereConditions,
} from '../helpers.ts';
import { applyQuery, fetchMany } from '../query.ts';
import type { EntityRepositoryAdapterOptions } from './types.ts';

/**
 * The TypeORM implementation of the entity repository port, configured per
 * entity. An adapter extends it with its options and adds only what is
 * bespoke to its entity.
 *
 * Reads that answer a caller (`findMany`, `findOneById`, `findOneByName`)
 * run `extendMany` / `extendOne`; `findOneBy` and `findManyBy` never do,
 * since a write loads through them and must not carry the extension back
 * into the save (the extra-attribute read/write rule).
 */
export abstract class EntityRepositoryAdapter<
    T extends ObjectLiteral,
    R extends Repository<T> = Repository<T>,
> implements IEntityRepository<T> {
    protected readonly repository: R;

    protected readonly options: EntityRepositoryAdapterOptions;

    protected constructor(repository: R, options: EntityRepositoryAdapterOptions) {
        this.repository = repository;
        this.options = options;
    }

    async findMany(query: IQuery): Promise<EntityRepositoryFindManyResult<T>> {
        const { alias } = this.options;

        const qb = this.repository.createQueryBuilder(alias);
        qb.groupBy(`${alias}.id`);

        const { pagination } = applyQuery(qb, query);
        this.applyRealmScopeSelect(qb);

        const { data, total } = await fetchMany(qb, query);
        await this.extendMany(data);

        return {
            data,
            meta: {
                total,
                ...pagination,
            },
        };
    }

    async findOneById(id: string): Promise<T | null> {
        const entity = await this.findOneBy({ id });
        if (entity) {
            await this.extendOne(entity);
        }

        return entity;
    }

    async findOneByName(name: string, realmKey?: string): Promise<T | null> {
        if (!this.options.realmRepository) {
            return null;
        }

        const qb = await this.createNameQueryBuilder(name, realmKey);
        if (!qb) {
            return null;
        }

        const entity = await qb.getOne();
        if (entity) {
            await this.extendOne(entity);
        }

        return entity;
    }

    async findOneByIdOrName(idOrName: string, realmKey?: string): Promise<T | null> {
        if (!this.options.realmRepository || isUUID(idOrName)) {
            return this.findOneById(idOrName);
        }

        return this.findOneByName(idOrName, realmKey);
    }

    async findManyBy(where: Record<string, any>): Promise<T[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<T | null> {
        if (hasUnmatchableId(where)) {
            return null;
        }

        return this.repository.findOne({
            where: translateWhereConditions(where),
            ...(this.options.lockRows ? { lock: { mode: 'pessimistic_write' } } : {}),
        });
    }

    create(data: Partial<T>): T {
        return this.repository.create(data as DeepPartial<T>);
    }

    merge(entity: T, data: Partial<T>): T {
        return this.repository.merge(entity, data as DeepPartial<T>);
    }

    async save(entity: T): Promise<T> {
        return this.persist(() => this.repository.save(entity));
    }

    async remove(entity: T): Promise<void> {
        await this.repository.remove(entity);
    }

    async validateJoinColumns(data: Partial<T>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: this.options.target,
        });
    }

    async checkUniqueness(data: Partial<T>, existing?: T): Promise<void> {
        const isUnique = await isEntityUnique({
            dataSource: this.repository.manager.connection,
            entityTarget: this.options.target,
            entity: data,
            entityExisting: existing,
        });

        if (!isUnique) {
            throw new EntityConflictError({ entity: this.options.entity });
        }
    }

    /**
     * A single read by id or name that also applies a decoded query
     * (fields, relations) to the row.
     */
    protected async findOneWithQuery(idOrName: string, query?: IQuery, realmKey?: string): Promise<T | null> {
        const { alias } = this.options;

        let qb : SelectQueryBuilder<T> | undefined;
        if (isUUID(idOrName)) {
            qb = this.repository.createQueryBuilder(alias);
            qb.where(`${alias}.id = :id`, { id: idOrName });
        } else {
            qb = await this.createNameQueryBuilder(idOrName, realmKey);
            if (!qb) {
                return null;
            }
        }

        applyQuery(qb, query);
        // the record read is checked per row as well, and `id` tells the
        // caller whether the row is its own (issue #3667)
        this.applyRealmScopeSelect(qb, ['id']);

        const entity = await qb.getOne();
        if (entity) {
            await this.extendOne(entity);
        }

        return entity;
    }

    /**
     * Force-select the columns the per-row realm gate reads: a `fields=`
     * projection that strips them would neutral-pass it (#3574, #3594).
     */
    protected applyRealmScopeSelect(qb: SelectQueryBuilder<T>, extraColumns: string[] = []): void {
        const { alias, realmScope } = this.options;
        if (!realmScope) {
            return;
        }

        applyJunctionRealmScopeSelect(
            qb,
            alias,
            realmScope.column ?? 'realmId',
            [...(realmScope.extraColumns ?? []), ...extraColumns],
        );
    }

    /**
     * Undefined when the realm key resolves to no realm: a name lookup
     * scoped to a realm that does not exist matches nothing (fail closed).
     */
    protected async createNameQueryBuilder(name: string, realmKey?: string): Promise<SelectQueryBuilder<T> | undefined> {
        const {
            alias, 
            nameColumn = 'name', 
            realmRepository, 
        } = this.options;

        const qb = this.repository.createQueryBuilder(alias);
        qb.where(`${alias}.${nameColumn} = :name`, { name });

        if (realmKey && realmRepository) {
            const realmId = await realmRepository.resolveId(realmKey);
            if (!realmId) {
                return undefined;
            }

            qb.andWhere(`${alias}.realmId = :realmId`, { realmId });
        }

        return qb;
    }

    /**
     * Run a write, answering a unique index refusing the row with a conflict
     * rather than a server error: it is the losing side of a race
     * `checkUniqueness` can not close. Every write an adapter adds besides
     * `save` (e.g. `saveWithEA`) goes through here too.
     */
    protected async persist<O>(write: () => Promise<O>): Promise<O> {
        try {
            return await write();
        } catch (e) {
            if (isUniqueConstraintDatabaseError(e)) {
                throw new EntityConflictError({ entity: this.options.entity });
            }

            throw e;
        }
    }

    protected async extendOne(_entity: T): Promise<void> {
        // no extension by default
    }

    protected async extendMany(_entities: T[]): Promise<void> {
        // no extension by default
    }
}
