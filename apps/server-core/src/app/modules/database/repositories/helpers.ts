/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    FindOptionsSelect,
    FindOptionsWhere,
    ObjectLiteral,
    Repository,
    SelectQueryBuilder,
} from 'typeorm';
import { isUUID } from '@authup/kit';
import { In, IsNull } from 'typeorm';

/**
 * Force-load the columns a realm-gated `getMany` per-row check depends on.
 * rapiq honors a client `fields` projection over the adapter `default`, so a
 * projection omitting `realmId` would otherwise hand the per-row record check
 * no realm at all: the check then throws instead of evaluating, and a fallback
 * to `null` would read the row as global to an ownOrNull-scoped reader.
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
    applyForcedSelect(qb, alias, ['realmId', ...extraColumns]);
}

/**
 * The same force-load for a row that carries no `realmId` at all — the gate
 * reads the OWNER entity's realm (`roleRealmId`, `clientRealmId`, `userRealmId`,
 * …), so that is the column a client `fields` projection must not be able to
 * strip (issue #3594). `extraColumns` covers a gate that reads more than the
 * realm, e.g. the ownership short-circuit on `identity-provider-account`
 * (issue #3601).
 */
export function applyJunctionRealmScopeSelect<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    ownerRealmKey: string,
    extraColumns: string[] = [],
): void {
    applyForcedSelect(qb, alias, [ownerRealmKey, ...extraColumns]);
}

function applyForcedSelect<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    columns: string[],
): void {
    const existing = new Set(qb.expressionMap.selects.map((select) => select.selection));
    const selections = columns
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

/**
 * An `id` that is not a uuid cannot match a row, since every entity key is
 * one. Checking it before the query makes every dialect answer the same:
 * postgres refuses to parse the value for a uuid column (22P02) where sqlite
 * and mysql compare and miss.
 */
export function hasUnmatchableId(where: Record<string, any>): boolean {
    return typeof where.id === 'string' && !isUUID(where.id);
}
