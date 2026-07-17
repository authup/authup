/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { In, IsNull } from 'typeorm';

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
