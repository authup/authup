/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IQuery } from '@rapiq/core';
import { Query, hasFieldConditions } from '@rapiq/core';
import { applyFieldConditions } from '@rapiq/adapter-memory';
import { TypeormAdapter } from '@rapiq/adapter-typeorm';
import type { SelectQueryBuilder } from 'typeorm';
import type { EntityRepositoryPaginationMeta } from '@authup/server-kit';

/**
 * Apply a decoded rapiq query (IR) to the given TypeORM query builder.
 * Schema allow-lists, defaults and pagination bounds were already
 * applied at decode time (`decodeQuery` in core/query) — this helper
 * only executes the IR. Returns the applied pagination for the
 * response meta block.
 *
 * Joins triggered by the parsed relations replicate the DISTINCT-id
 * pattern: when the builder already groups by the root id, every join
 * contributes its own `GROUP BY <alias>.id`.
 *
 * Field visibility conditions (`IField.condition`, attached by a
 * schema `fields.validateMany` gate) cannot go into the statement — a
 * TypeORM selection must stay a bare column for entity hydration.
 * The adapter projects the gated column unconditionally and
 * force-selects every column its condition reads (rapiq#830's operand
 * projection — the SQL counterpart of the plan-039 force-select
 * discipline, so a sparse replace-projection can neither over-redact
 * nor fail open on missing operands); the fetching adapter MUST then
 * run the rows through `redactFieldConditions` before returning them.
 */
export function applyQuery(
    queryBuilder: SelectQueryBuilder<any>,
    query?: IQuery,
) : { pagination: EntityRepositoryPaginationMeta } {
    const adapter = new TypeormAdapter({
        queryBuilder,
        relations: {
            onJoin: (_path, alias, qb) => {
                if (qb.expressionMap.groupBys.length > 0) {
                    qb.addGroupBy(`${alias}.id`);
                }
            },
        },
    });

    const { pagination } = adapter.execute(query ?? new Query({}));

    return { pagination };
}

/**
 * Enforce the field visibility conditions of a decoded query on
 * already-fetched rows: a gated column is dropped from every row that
 * fails its condition; no row is ever removed. The SQL execution path
 * projects gated columns unconditionally, so EVERY `findMany` adapter
 * must pass its fetched entities through this before returning them —
 * enforcement is fail-open by construction (a skipped call ships the
 * value). Condition-less queries pass through untouched.
 */
export function redactFieldConditions<T>(query: IQuery | undefined, data: T[]) : T[] {
    if (!query || !hasFieldConditions(query.fields)) {
        return data;
    }

    return applyFieldConditions(query.fields, data);
}
