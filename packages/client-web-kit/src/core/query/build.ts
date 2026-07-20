/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    FieldsBuildInput,
    FiltersBuildInput,
    ICondition,
    IFields,
    IPagination,
    IQuery,
    IRelations,
    ISorts,
    ObjectLiteral,
    PaginationBuildInput,
    RelationsBuildInput,
    SortsBuildInput,
} from '@rapiq/core';
import { defineQuery } from '@rapiq/core';
import { isObject } from 'smob';

/**
 * Depth-bounded rapiq build inputs for component props. The library
 * defaults (depth 5) explode TypeScript's inferred-type serialization
 * for self-recursive entities (e.g. Policy.children); UI queries never
 * address more than three relation segments.
 */
export type QueryFiltersInput<
    T extends ObjectLiteral = ObjectLiteral,
> = FiltersBuildInput<T, 3>;

export type QueryFieldsInput<
    T extends ObjectLiteral = ObjectLiteral,
> = FieldsBuildInput<T, 3>;

export type QueryRelationsInput<
    T extends ObjectLiteral = ObjectLiteral,
> = RelationsBuildInput<T, 3>;

export type QuerySortInput<
    T extends ObjectLiteral = ObjectLiteral,
> = SortsBuildInput<T, 3>;

/**
 * Typed authoring input for component props and manager contexts.
 * Mirrors rapiq's QueryBuildInput (each parameter also accepts an
 * already-built AST fragment, so condition helpers like or()/eq()
 * assign without casts) at the depth bound above. Desugared into the
 * IR via defineQuery at the consuming boundary.
 */
export type QueryInput<
    T extends ObjectLiteral = ObjectLiteral,
> = {
    fields?: QueryFieldsInput<T> | IFields,
    filters?: QueryFiltersInput<T> | ICondition,
    pagination?: PaginationBuildInput | IPagination,
    relations?: QueryRelationsInput<T> | IRelations,
    sort?: QuerySortInput<T> | ISorts,
};

/**
 * Accepted query shape wherever the kit takes a query from the outside:
 * typed build input or the assembled rapiq IR.
 */
export type EntityListQueryInput<
    T extends ObjectLiteral = ObjectLiteral,
> = QueryInput<T> | IQuery;

/**
 * Duck-typed IR guard until rapiq ships the node guard family
 * (tada5hi/rapiq#774): every IR node exposes the visitor entry point.
 */
export function isQuery(input: unknown) : input is IQuery {
    return isObject(input) &&
        typeof (input as IQuery).accept === 'function';
}

export function isCondition(input: unknown) : input is ICondition {
    return isObject(input) &&
        typeof (input as ICondition).operator === 'string' &&
        'value' in input;
}

export function isSortsNode(input: unknown) : input is ISorts {
    return isObject(input) &&
        typeof (input as ISorts).accept === 'function' &&
        Array.isArray((input as ISorts).value);
}

/**
 * Normalize accepted query input to the IR: an assembled query passes
 * through untouched, typed build input is desugared via defineQuery.
 */
export function normalizeQueryInput<T extends ObjectLiteral>(
    input?: EntityListQueryInput<T>,
) : IQuery {
    if (isQuery(input)) {
        return input;
    }

    return defineQuery(input as Parameters<typeof defineQuery>[0]);
}
