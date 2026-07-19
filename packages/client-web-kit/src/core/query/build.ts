/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    FieldsBuildInput,
    FiltersBuildInput,
    ObjectLiteral,
    PaginationBuildInput,
    RelationsBuildInput,
    SortsBuildInput,
} from '@rapiq/core';

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

export type QueryInput<
    T extends ObjectLiteral = ObjectLiteral,
> = {
    fields?: QueryFieldsInput<T>,
    filters?: QueryFiltersInput<T>,
    pagination?: PaginationBuildInput,
    relations?: QueryRelationsInput<T>,
    sort?: QuerySortInput<T>,
};
