/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ActorContext } from '@authup/server-kit';
import { inArray, or } from '@rapiq/core';
import type { ICondition, IQuery } from '@rapiq/core';
import { appendQueryConditions } from './module.ts';

export type ReadScopeOptions = {
    /**
     * The read permissions, pre-gated as a disjunction and compiled into
     * the row condition.
     */
    names: string[],
    /**
     * The rows the actor may always read (its own), ORed into the compiled
     * reach and standing alone when the reach denies.
     */
    ownership?: ICondition | null,
    /**
     * A failed pre-gate narrows to the ownership term instead of refusing
     * (the self-service lists: sessions, events).
     */
    selfService?: boolean,
    /**
     * `false` for a list that pre-gates by name and lowers no reach.
     */
    compile?: boolean,
    /**
     * The row's realm column when it is not `realmId`.
     */
    realmAttributeName?: string,
};

/**
 * A read query with the actor's reach applied. `post` means the reach did
 * not lower: the query is returned unscoped and the caller decides, a list
 * by evaluating each row, a grouped count by narrowing to the ownership term
 * (`narrowReadScope`).
 */
export type ReadScope = {
    query: IQuery,
    post: boolean,
    ownership: ICondition | null,
};

/**
 * The gate every collection read runs, in one place: pre-gate, compile,
 * and the verdict lowered onto the query. A list and a statistic over the
 * same entity call it with the same options, so the two cannot disagree
 * about which rows the actor reaches.
 */
export async function scopeReadQuery(
    query: IQuery,
    actor: ActorContext,
    options: ReadScopeOptions,
): Promise<ReadScope> {
    const ownership = options.ownership ?? null;

    try {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: options.names });
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

    const compiled = await actor.permissionEvaluator.compile({
        name: options.names,
        ...(options.realmAttributeName ? { realmAttributeName: options.realmAttributeName } : {}),
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
            };
        case 'deny':
            return {
                query: appendQueryConditions(query, ownership ?? inArray('id', [])),
                post: false,
                ownership,
            };
        default:
            return {
                query, 
                post: true, 
                ownership, 
            };
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

/**
 * A service whose collection read is gated by `scopeReadQuery`, exposing
 * the gate so a statistic over the same entity applies it verbatim.
 */
export interface IReadScoper {
    scopeRead(query: IQuery, actor: ActorContext): Promise<ReadScope>;
}
