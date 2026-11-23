/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Query, inArray, or } from '@rapiq/core';
import type { ICondition, IQuery } from '@rapiq/core';
import type { IPermissionEvaluator } from '../evaluator/index.ts';
import type { ReadScope, ReadScopeOptions } from './types.ts';

/**
 * Append server-derived conditions (a route realm, an owner scope, ...)
 * onto a decoded query by AND-wrapping its filter tree. A client-sent
 * condition on the same field intersects with the scope instead of
 * replacing it, and compound client trees (`or(...)`) are preserved
 * as-is. Same guarantee class as a mandatory `andWhere` at the
 * repository, expressed once in the IR. Appended conditions do not
 * pass through a decode, so the schema allow-lists do not constrain
 * them (server-derived context).
 *
 * Immutable: returns a new `Query` whose filters node is the
 * AND-wrapped successor (`IFilters.and`); every other parameter node is
 * carried over **by reference**, so the input query stays untouched and
 * nothing is copied. The node enumeration mirrors rapiq's
 * `QueryContext`: keep it in sync when the IR gains a parameter.
 *
 * Non-displaceability is structural (rapiq beta.19,
 * tada5hi/rapiq#890): filter composition is conjunctive throughout, so
 * no later composition step can drop a conjunct and the appended scope
 * needs no marker to survive.
 */
export function appendQueryConditions(query: IQuery, ...conditions: ICondition[]) : Query {
    return new Query({
        fields: query.fields,
        filters: query.filters.and(...conditions),
        relations: query.relations,
        pagination: query.pagination,
        sorts: query.sorts,
        groups: query.groups,
        aggregates: query.aggregates,
    });
}

/**
 * The gate a collection read runs, in one place: pre-gate, compile, and the
 * verdict lowered onto the query. A list and a statistic over the same
 * resource call it with the same options, so the two cannot disagree about
 * which rows the actor reaches.
 */
export async function scopeReadQuery(
    query: IQuery,
    evaluator: IPermissionEvaluator,
    options: ReadScopeOptions,
): Promise<ReadScope> {
    const ownership = options.ownership ?? null;
    // The definition owner goes to both calls: a pre-gate looking up the
    // global definition would refuse a grant of an owned one.
    const owner = {
        ...(typeof options.realmId !== 'undefined' ? { realmId: options.realmId } : {}),
        ...(typeof options.clientId !== 'undefined' ? { clientId: options.clientId } : {}),
    };

    try {
        await evaluator.preEvaluateOneOf({ name: options.names, ...owner });
    } catch (e) {
        if (!ownership || !options.selfService) {
            throw e;
        }

        return {
            query: appendQueryConditions(query, ownership),
            post: false,
            ownership,
        };
    }

    if (options.compile === false) {
        return {
            query,
            post: false,
            ownership,
        };
    }

    const compiled = await evaluator.compile({
        name: options.names,
        ...owner,
        ...(options.realmAttributeName ? { realmAttributeName: options.realmAttributeName } : {}),
        ...(typeof options.realm !== 'undefined' ? { realm: options.realm } : {}),
    });

    switch (compiled.verdict) {
        case 'allow':
            return {
                query,
                post: false,
                ownership,
            };
        case 'conditional':
            return {
                query: appendQueryConditions(
                    query,
                    ownership ? or(ownership, compiled.condition) : compiled.condition,
                ),
                post: false,
                ownership,
                reach: compiled.condition,
            };
        case 'deny':
            return {
                query: appendQueryConditions(query, ownership ?? inArray('id', [])),
                post: false,
                ownership,
            };
        default: {
            const retain = [
                ...(typeof options.realm === 'undefined' ? [options.realmAttributeName ?? 'realmId'] : []),
                ...(options.retain ?? []),
            ];

            return {
                query: options.widen ? options.widen(query, retain) : query,
                post: true,
                ownership,
            };
        }
    }
}

/**
 * A scope a caller can execute without a per-row loop: a `post` verdict
 * narrows to the ownership term, or to nothing, the direction that cannot
 * over-disclose.
 */
export function narrowReadScope(scope: ReadScope): IQuery {
    if (!scope.post) {
        return scope.query;
    }

    return appendQueryConditions(scope.query, scope.ownership ?? inArray('id', []));
}
