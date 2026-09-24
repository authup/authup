/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Path, Realm } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { IPathRepository } from '../../../../../core/index.ts';
import { isDatabaseTypeRowLockable } from '../../../../../adapters/database/helpers/index.ts';
import { PathEntity, RealmEntity } from '../../../../../adapters/database/domains/index.ts';
import { EntityRepositoryAdapter } from '../entity/index.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';
import { runPathTransaction, unwindPaths } from './unwind.ts';

export type PathRepositoryAdapterContext = {
    repository: Repository<Path>,
    realmRepository: Repository<Realm>,
};

export type PathRepositoryAdapterOptions = {
    lockRows?: boolean,
};

export class PathRepositoryAdapter extends EntityRepositoryAdapter<Path> implements IPathRepository {
    constructor(ctx: PathRepositoryAdapterContext, options: PathRepositoryAdapterOptions = {}) {
        super(ctx.repository, {
            alias: 'path',
            target: PathEntity,
            entity: 'path',
            // the per-row realm gate reads `realmId` (issue #3574)
            realmScope: {},
            realmRepository: new RealmRepositoryAdapter(ctx.realmRepository),
            // a folder is addressed by its FULL path, never by the single
            // segment `name`: the name repeats across the tree while the
            // path is unique per realm
            nameColumn: 'path',
            lockRows: options.lockRows,
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

        if (this.options.lockRows) {
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

    override async remove(entity: Path): Promise<void> {
        await runPathTransaction(this.repository.manager, async (manager) => {
            // the path as it stands under the lock: a rename committed since
            // the caller's read would otherwise leave its subtree to the
            // database cascade
            const current = await manager.getRepository(PathEntity).findOne({
                where: { id: entity.id },
                ...(isDatabaseTypeRowLockable(manager.connection.options.type) ?
                    { lock: { mode: 'pessimistic_write' } } :
                    {}),
            });
            if (!current) {
                return;
            }

            await unwindPaths(manager, {
                realmId: current.realmId,
                path: current.path,
                keepRoot: true,
            });
            await manager.getRepository(PathEntity).remove(entity);
        });
    }

    async transaction<R>(fn: (repository: IPathRepository) => Promise<R>): Promise<R> {
        const { type } = this.repository.manager.connection.options;
        if (!isDatabaseTypeRowLockable(type)) {
            // better-sqlite3: plain unlocked passthrough (the removeGuarded rule)
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
        return runPathTransaction(this.repository.manager, (manager) => fn(new PathRepositoryAdapter({
            repository: manager.getRepository(PathEntity),
            realmRepository: manager.getRepository(RealmEntity),
        }, { lockRows: true })));
    }
}
