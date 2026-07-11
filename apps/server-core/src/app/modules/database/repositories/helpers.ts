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
 * projection omitting `realm_id` would otherwise leave the per-row
 * `resourceRealmMatch` with no realm to match — neutralizing the realm_scope
 * reach factor and leaking cross-realm rows to an own/ownOrNull-scoped reader.
 * `addSelect` appends to the projected SELECT and is a no-op when the column
 * is already selected. Call it AFTER `applyQuery`.
 */
export function applyRealmScopeSelect<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    extraColumns: string[] = [],
): void {
    qb.addSelect([
        `${alias}.realm_id`,
        ...extraColumns.map((column) => `${alias}.${column}`),
    ]);
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
