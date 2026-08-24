/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    DataSource,
    EntityTarget,
    FindOptionsSelect,
    FindOptionsWhere,
    ObjectLiteral,
    Repository,
    SelectQueryBuilder,
} from 'typeorm';
import { Brackets, In, IsNull } from 'typeorm';

/**
 * Force-load the columns a realm-gated `getMany` per-row check depends on.
 * rapiq honors a client `fields` projection over the adapter `default`, so a
 * projection omitting `realmId` would otherwise leave the per-row
 * `resourceRealmMatch` with no realm to match — neutralizing the realmScope
 * reach factor and leaking cross-realm rows to an own/ownOrNull-scoped reader.
 * Call it AFTER `applyQuery`. Columns already in the projection must be
 * skipped: `addSelect` emits a second identically-aliased column, and under a
 * join + take (the DISTINCT id-subquery) postgres then rejects the wrapper's
 * `ORDER BY "<alias>_id"` as ambiguous (mysql: duplicate column name).
 */
export function applyRealmScopeSelect<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    extraColumns: string[] = [],
): void {
    const existing = new Set(qb.expressionMap.selects.map((select) => select.selection));
    const selections = ['realmId', ...extraColumns]
        .map((column) => `${alias}.${column}`)
        .filter((selection) => !existing.has(selection));

    if (selections.length > 0) {
        qb.addSelect(selections);
    }
}

/**
 * Resolve a caller-supplied sweep batch size against its default. A
 * non-positive or non-integral size must never reach `take`: typeorm ignores
 * a falsy one, which silently restores the single unbounded DELETE the
 * batching exists to prevent, and the rest reach the driver as invalid SQL.
 */
export function resolveSweepBatchSize(requested: number | undefined, fallback: number): number {
    if (
        typeof requested === 'number' &&
        Number.isSafeInteger(requested) &&
        requested > 0
    ) {
        return requested;
    }

    return fallback;
}

/**
 * Delete every row matching `where`, one bounded statement at a time, looping
 * until the match is drained. The retention and expiry sweeps run every
 * minute on every replica, and the first one after a retention change (or the
 * day a full window first matures) can match millions of rows: a single
 * unbounded DELETE would then be one long transaction, issued concurrently by
 * every replica.
 *
 * Ids are selected first and deleted by id, because `DELETE ... LIMIT` is
 * MySQL-only. A batch that removes nothing means another replica's sweep owns
 * those rows, so the loop stops rather than re-selecting them; the next tick
 * picks up whatever is left.
 */
export async function deleteInBatches<T extends ObjectLiteral & { id: string }>(
    repository: Repository<T>,
    where: FindOptionsWhere<T>,
    batchSize: number,
): Promise<number> {
    let total = 0;

    for (;;) {
        const rows = await repository.find({
            select: { id: true } as FindOptionsSelect<T>,
            where,
            take: batchSize,
        });

        if (rows.length === 0) {
            break;
        }

        const result = await repository.delete({ id: In(rows.map((row) => row.id)) } as FindOptionsWhere<T>);

        // A driver that does not report affected rows still made progress, so
        // count the batch rather than returning 0.
        total += result.affected ?? rows.length;

        if (result.affected === 0) {
            break;
        }

        if (rows.length < batchSize) {
            break;
        }
    }

    return total;
}

/**
 * Naming-strategy-safe replacement for typeorm-extension's `isEntityUnique`:
 * the upstream helper interpolates bare property names into the WHERE clause,
 * which no longer resolve as columns once the snake_case naming strategy
 * decouples property names (`realmId`) from column names (`realm_id`).
 * Alias-qualified property paths (`entity.realmId`) let TypeORM translate
 * them through the entity metadata instead.
 */
export async function isEntityUnique<T extends ObjectLiteral>(options: {
    dataSource: DataSource,
    entityTarget: EntityTarget<T>,
    entity: Partial<T>,
    entityExisting?: T | null,
}): Promise<boolean> {
    const metadata = options.dataSource.getMetadata(options.entityTarget);
    const repository = options.dataSource.getRepository<T>(options.entityTarget);

    const columnGroups : string[][] = metadata.ownUniques.length > 0 ?
        metadata.ownUniques.map(
            (unique) => unique.columns.map((column) => column.propertyName),
        ) :
        metadata.indices
            .filter((index) => index.isUnique && index.entityMetadata.target === metadata.target)
            .map((index) => index.columns.map((column) => column.propertyName));

    const primaryKeys = metadata.primaryColumns.map((column) => column.propertyName);

    for (const group of columnGroups) {
        const qb = repository.createQueryBuilder('entity');

        qb.where(new Brackets((inner) => {
            for (const key of group) {
                const value = (options.entity as ObjectLiteral)[key] ?? null;
                if (value === null) {
                    inner.andWhere(`entity.${key} IS NULL`);
                } else {
                    inner.andWhere(`entity.${key} = :target_${key}`, { [`target_${key}`]: value });
                }
            }
        }));

        if (options.entityExisting) {
            const existing = options.entityExisting as ObjectLiteral;
            qb.andWhere(new Brackets((inner) => {
                for (const key of primaryKeys) {
                    const value = existing[key] ?? null;
                    if (value === null) {
                        inner.andWhere(`entity.${key} IS NOT NULL`);
                    } else {
                        inner.andWhere(`entity.${key} != :source_${key}`, { [`source_${key}`]: value });
                    }
                }
            }));
        }

         
        const entity = await qb.getOne();
        if (entity) {
            return false;
        }
    }

    return true;
}

export function translateWhereConditions(where: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    Object.entries(where).forEach(([key, value]) => {
        if (value === null) {
            result[key] = IsNull();
        } else if (Array.isArray(value)) {
            result[key] = In(value);
        } else {
            result[key] = value;
        }
    });
    return result;
}
