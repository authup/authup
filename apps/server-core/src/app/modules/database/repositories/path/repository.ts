/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Path, Realm } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import { isUUID } from '@authup/kit';
import { EntityConflictError } from '@authup/errors';
import type { Repository } from 'typeorm';
import { validateEntityJoinColumns } from 'typeorm-extension';
import { applyQuery, fetchMany } from '../query.ts';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type { IPathRepository, IRealmRepository } from '../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../adapters/database/index.ts';
import { isUniqueConstraintDatabaseError } from '../../../../../adapters/database/errors/index.ts';
import { isDatabaseTypeRowLockable } from '../../../../../adapters/database/helpers/index.ts';
import { applyRealmScopeSelect, isEntityUnique, translateWhereConditions } from '../helpers.ts';
import { PathEntity, RealmEntity } from '../../../../../adapters/database/domains/index.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type PathRepositoryAdapterContext = {
    repository: Repository<Path>,
    realmRepository: Repository<Realm>,
};

export class PathRepositoryAdapter implements IPathRepository {
    private readonly repository: Repository<Path>;

    private readonly realmRepository: IRealmRepository;

    constructor(ctx: PathRepositoryAdapterContext) {
        this.repository = ctx.repository;
        this.realmRepository = new RealmRepositoryAdapter(ctx.realmRepository);
    }

    async findMany(query: IQuery): Promise<EntityRepositoryFindManyResult<Path>> {
        const qb = this.repository.createQueryBuilder('path');
        qb.groupBy('path.id');

        const { pagination } = applyQuery(qb, query);
        // the per-row realm gate reads `realmId`, and `resourceRealmMatch` is
        // PRESENCE-based — a `fields=` projection that strips the column would
        // leave the realm-match key absent and neutral-pass (issue #3574)
        applyRealmScopeSelect(qb, 'path');

        const { data: entities, total } = await fetchMany(qb, query);

        return {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        };
    }

    findOneById(id: string): Promise<Path | null> {
        return this.findOneBy({ id });
    }

    /**
     * A folder is addressed by its FULL path, never by the single segment
     * `name`: the name repeats across the tree while the path is unique
     * per realm.
     */
    async findOneByName(name: string, realmKey?: string): Promise<Path | null> {
        const qb = this.repository.createQueryBuilder('path');
        qb.where('path.path = :path', { path: name });

        if (realmKey) {
            const realmId = await this.realmRepository.resolveId(realmKey);
            if (!realmId) {
                return null;
            }
            qb.andWhere('path.realmId = :realmId', { realmId });
        }

        return qb.getOne();
    }

    async findOneByIdOrName(idOrName: string, realm?: string): Promise<Path | null> {
        return isUUID(idOrName) ?
            this.findOneById(idOrName) :
            this.findOneByName(idOrName, realm);
    }

    async findManyBy(where: Record<string, any>): Promise<Path[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<Path | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    async findDescendants(entity: Path): Promise<Path[]> {
        const prefix = `${entity.path}/`;

        const entities = await this.repository.createQueryBuilder('path')
            .where('path.realmId = :realmId', { realmId: entity.realmId })
            .andWhere('path.path LIKE :prefix', { prefix: `${prefix}%` })
            .getMany();

        // `_` is a single-character LIKE wildcard AND a legal path character
        // ([a-z0-9-_.]), so the statement above over-matches: a rename of
        // `sales_eu` would otherwise pick up a sibling `salesxeu`'s subtree and
        // rewrite it. The LIKE stays as the index-friendly pre-filter and the
        // exact prefix decides, which needs no dialect-specific ESCAPE clause.
        return entities.filter((item) => item.path.startsWith(prefix));
    }

    create(data: Partial<Path>): Path {
        return this.repository.create(data);
    }

    merge(entity: Path, data: Partial<Path>): Path {
        return this.repository.merge(entity, data);
    }

    async save(entity: Path): Promise<Path> {
        try {
            return await this.repository.save(entity);
        } catch (e) {
            // ensurePath re-reads the row that won the race; anything else
            // is an ordinary conflict
            if (isUniqueConstraintDatabaseError(e)) {
                throw new EntityConflictError({ entity: 'path' });
            }

            throw e;
        }
    }

    async remove(entity: Path): Promise<void> {
        await this.repository.remove(entity);
    }

    async transaction<R>(fn: (repository: IPathRepository) => Promise<R>): Promise<R> {
        const dataSource = this.repository.manager.connection;
        if (!isDatabaseTypeRowLockable(dataSource.options.type)) {
            // better-sqlite3: the driver shares ONE query runner, so a
            // transaction here would nest as a savepoint inside whatever is
            // running on it. Plain unlocked passthrough (the removeGuarded rule).
            return fn(this);
        }

        // mysql / postgres: a rename rewrites the folder and every descendant,
        // so the two writes ride one transaction. No row lock is taken: a
        // concurrent rename of the same subtree loses on the unique key.
        return dataSource.transaction((manager) => fn(new PathRepositoryAdapter({
            repository: manager.getRepository(PathEntity),
            realmRepository: manager.getRepository(RealmEntity),
        })));
    }

    async validateJoinColumns(data: Partial<Path>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: PathEntity,
        });
    }

    async checkUniqueness(data: Partial<Path>, existing?: Path): Promise<void> {
        const isUnique = await isEntityUnique({
            dataSource: this.repository.manager.connection,
            entityTarget: PathEntity,
            entity: data,
            entityExisting: existing,
        });

        if (!isUnique) {
            throw new DatabaseConflictError();
        }
    }
}
