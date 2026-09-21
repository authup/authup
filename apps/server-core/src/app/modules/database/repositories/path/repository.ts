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
import { isTransientLockDatabaseError, isUniqueConstraintDatabaseError } from '../../../../../adapters/database/errors/index.ts';
import { isDatabaseTypeRowLockable } from '../../../../../adapters/database/helpers/index.ts';
import { applyRealmScopeSelect, isEntityUnique, translateWhereConditions } from '../helpers.ts';
import { PathEntity, RealmEntity } from '../../../../../adapters/database/domains/index.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type PathRepositoryAdapterContext = {
    repository: Repository<Path>,
    realmRepository: Repository<Realm>,
};

export type PathRepositoryAdapterOptions = {
    lockRows?: boolean,
};

/**
 * A rename locks the folder, its resolved parent and its descendants, so two
 * renames at different depths of ONE chain take those rows in opposite orders
 * and the server breaks the cycle by aborting one side. Measured on postgres,
 * a parent rename raced against its child's deadlocked 9 times in 24.
 *
 * The aborted transaction wrote nothing and the callback derives every write
 * from its own locked reads, so re-running it IS the recovery. Without this a
 * routine concurrent rename answers an unmapped 500.
 */
const TRANSACTION_ATTEMPTS = 3;

export class PathRepositoryAdapter implements IPathRepository {
    private readonly repository: Repository<Path>;

    private readonly realmRepository: IRealmRepository;

    private readonly lockRows: boolean;

    constructor(ctx: PathRepositoryAdapterContext, options: PathRepositoryAdapterOptions = {}) {
        this.repository = ctx.repository;
        this.realmRepository = new RealmRepositoryAdapter(ctx.realmRepository);
        this.lockRows = options.lockRows ?? false;
    }

    async findMany(query: IQuery): Promise<EntityRepositoryFindManyResult<Path>> {
        const qb = this.repository.createQueryBuilder('path');
        qb.groupBy('path.id');

        const { pagination } = applyQuery(qb, query);
        // the per-row realm gate reads `realmId`, and `resourceRealmMatch` is
        // PRESENCE-based: a `fields=` projection that strips the column would
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
        return this.repository.findOne({
            where: translateWhereConditions(where),
            ...(this.lockRows ? { lock: { mode: 'pessimistic_write' } } : {}),
        });
    }

    /**
     * ponytail: the whole subtree is loaded with no `take`, and the caller
     * writes one row per descendant. The folder table is the small one
     * (`PATH_MAX_DEPTH` bounds the depth, nothing bounds the breadth), so a
     * page size here would only buy a half-rewritten subtree across pages.
     */
    async findDescendants(entity: Path): Promise<Path[]> {
        const prefix = `${entity.path}/`;

        const qb = this.repository.createQueryBuilder('path')
            .where('path.realmId = :realmId', { realmId: entity.realmId })
            .andWhere('path.path LIKE :prefix', { prefix: `${prefix}%` });

        if (this.lockRows) {
            qb.setLock('pessimistic_write');
        }

        const entities = await qb.getMany();

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
        // so the two writes ride one transaction. The callback gets an adapter
        // bound to that transaction whose reads take a row lock: the unique key
        // catches nothing here, since two renames at different depths of one
        // chain write different paths (`marketing` and `sales/munich`) and
        // collide on no constraint, leaving a descendant under a stale prefix.
        // Locking the row, its resolved parent and the descendant set serializes
        // them, so the second request re-reads what the first committed.
        let lastError: unknown;

        for (let attempt = 1; attempt <= TRANSACTION_ATTEMPTS; attempt++) {
            try {
                return await dataSource.transaction((manager) => fn(new PathRepositoryAdapter({
                    repository: manager.getRepository(PathEntity),
                    realmRepository: manager.getRepository(RealmEntity),
                }, { lockRows: true })));
            } catch (e) {
                if (!isTransientLockDatabaseError(e)) {
                    throw e;
                }

                lastError = e;

                // the peer that won the cycle still holds its locks, and a
                // fixed delay would line both retries up again

                await new Promise((resolve) => {
                    setTimeout(resolve, attempt * 10 + Math.floor(Math.random() * 10));
                });
            }
        }

        throw lastError;
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
