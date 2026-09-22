/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IFilter, Validator } from '@rapiq/core';
import { ErrorCode, FilterFieldOperator, FiltersParseError } from '@rapiq/core';

const RANGE_OPERATORS: string[] = [
    FilterFieldOperator.LESS_THAN,
    FilterFieldOperator.LESS_THAN_EQUAL,
    FilterFieldOperator.GREATER_THAN,
    FilterFieldOperator.GREATER_THAN_EQUAL,
];

/**
 * The timestamp columns every entity carries (`@CreateDateColumn` /
 * `@UpdateDateColumn`). Matched on the leaf's LAST path segment, so a
 * dotted key reaching one through a relation (`user.createdAt`) is held
 * to the same rule as the root column.
 */
export const TIMESTAMP_FILTER_KEYS = ['createdAt', 'updatedAt'];

/**
 * Filters validate hook that admits a timestamp column under the range
 * operators only (`lt`, `lte`, `gt`, `gte`) and refuses every other
 * operator with a 400.
 *
 * Equality cannot be offered honestly: the stored precision differs by
 * dialect (postgres `timestamp` and mysql `datetime(6)` keep
 * microseconds, sqlite keeps seconds) while the API answers milliseconds,
 * so `eq` against a value the API returned matches nothing, and `in` /
 * `ne` / `nin` inherit the same defect. A filter that silently matches
 * nothing is worse than one that is refused. The refusal THROWS rather
 * than returning `undefined`: under rapiq's default dropping policy a
 * rejected leaf is removed, which would widen the result to every row.
 *
 * Every other leaf passes through untouched.
 */
export function createTimestampFiltersGate(keys: string[] = TIMESTAMP_FILTER_KEYS): Validator {
    return (input: IFilter) => {
        const segments = input.field.split('.');
        const name = segments[segments.length - 1];
        if (!keys.includes(name) || RANGE_OPERATORS.includes(input.operator)) {
            return input;
        }

        throw new FiltersParseError({
            message: `The key ${input.field} accepts only the range operators ${RANGE_OPERATORS.join(', ')}.`,
            code: ErrorCode.OPERATOR_UNSUPPORTED,
        });
    };
}
