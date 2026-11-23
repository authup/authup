/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICondition, IQuery } from '@rapiq/core';
import type { RecordRealm } from '../record/index.ts';

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
    /**
     * The realm every row belongs to, for rows that carry no realm column:
     * a realm settles the reach, `false` names a resource of no realm.
     * See `PermissionCompileContext.realm`.
     */
    realm?: RecordRealm | false,
    /**
     * Widens the query of a `post` verdict, so the per-row check the caller
     * runs sees the whole row rather than the requested projection. It
     * receives the columns that must stay in the response: the realm column
     * (unless `realm` is fixed) and `retain`.
     */
    widen?: (query: IQuery, retain: string[]) => IQuery,
    /**
     * The columns besides the realm column the caller loads for every read.
     * They stay in the response of a widened read.
     */
    retain?: string[],
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
    /**
     * The compiled reach of a `conditional` verdict, before the ownership
     * term was ORed in: a statistic splits the two to answer the reach
     * from stored rollups and only the actor's own rows outside it raw.
     */
    reach?: ICondition,
};
