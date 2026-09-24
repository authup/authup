/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Brackets, In } from 'typeorm';
import type { EntityManager } from 'typeorm';
import {
    ClientEntity,
    PathEntity,
    UserEntity,
} from '../../../../../adapters/database/domains/index.ts';

/**
 * Well below the 65535 bound parameters postgres allows per statement.
 */
const CHUNK_SIZE = 500;

function chunk<T>(items: T[]) : T[][] {
    const output : T[][] = [];
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        output.push(items.slice(i, i + CHUNK_SIZE));
    }

    return output;
}

function countSegments(path: string) : number {
    return path.split('/').length;
}

/**
 * Remove a folder subtree (or every folder of a realm) without relying on the
 * database cascades.
 *
 * On mysql a delete that cascades down `parent_id` and then sets `path_id`
 * NULL on the users and clients filed there counts every level against
 * InnoDB's cascade limits: 15 levels deep, and (from MySQL 9) 30 tables per
 * statement. A realm holding a user three folders deep already exceeded the
 * second, so the realm delete answered 500. Unfiling the occupants first and
 * deleting the folders deepest level first leaves every statement with
 * nothing below it to cascade into, on every dialect.
 *
 * `path` narrows to one folder and its descendants; without it every folder
 * of the realm is removed. The folder named by `path` is left in place when
 * `keepRoot` is set, so the caller can remove that one row through the
 * repository and keep its subscriber.
 */
export async function unwindPaths(
    manager: EntityManager,
    where: {
        realmId: string,
        path?: string,
        keepRoot?: boolean
    },
) : Promise<void> {
    const qb = manager.getRepository(PathEntity)
        .createQueryBuilder('path')
        .select(['path.id', 'path.path'])
        .where('path.realmId = :realmId', { realmId: where.realmId });

    if (where.path) {
        const { path } = where;
        qb.andWhere(new Brackets((sub) => {
            sub.where('path.path = :path', { path });
            sub.orWhere('path.path LIKE :prefix', { prefix: `${path}/%` });
        }));
    }

    // LIKE treats `_` as a wildcard, so the prefix match is re-checked here
    const rows = (await qb.getMany())
        .filter((row) => !where.path || row.path === where.path || row.path.startsWith(`${where.path}/`));

    if (rows.length === 0) {
        return;
    }

    const ids = rows.map((row) => row.id);
    for (const part of chunk(ids)) {
        await manager.getRepository(UserEntity).update({ pathId: In(part) }, { pathId: null });
        await manager.getRepository(ClientEntity).update({ pathId: In(part) }, { pathId: null });
    }

    const levels = new Map<number, string[]>();
    for (const row of rows) {
        if (where.keepRoot && row.path === where.path) {
            continue;
        }

        const depth = countSegments(row.path);
        const level = levels.get(depth) || [];
        level.push(row.id);
        levels.set(depth, level);
    }

    const depths = levels.keys().toArray().sort((a, b) => b - a);
    for (const depth of depths) {
        for (const part of chunk(levels.get(depth)!)) {
            await manager.getRepository(PathEntity).delete({ id: In(part) });
        }
    }
}
