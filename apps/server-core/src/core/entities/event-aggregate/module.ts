/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICondition, IQuery } from '@rapiq/core';
import {
    Aggregate,
    Aggregates,
    Filters,
    Group,
    Groups,
    Query,
    gte,
    isFilter,
    isFilters,
    lt,
} from '@rapiq/core';
import { readConjuncts } from '../../stats/window.ts';

/**
 * The event columns a rollup row carries, in the event schema's vocabulary.
 */
export const EVENT_AGGREGATE_COLUMNS = ['realmId', 'scope', 'name', 'refType', 'createdAt'];

function toDay(input: Date): string {
    return input.toISOString().slice(0, 10);
}

/**
 * A rollup answers whole days, so it answers a bound only on a day
 * boundary (`gte` / `lt` at 00:00Z). Any other bound, an unparsable one
 * included, is undefined: the raw rows answer it exactly.
 */
function translateCondition(condition: ICondition): ICondition | undefined {
    if (isFilters(condition)) {
        const children = condition.value.map((child) => translateCondition(child));
        if (children.some((child) => !child)) {
            return undefined;
        }

        return new Filters(condition.operator, children as ICondition[], { preserved: condition.preserved });
    }

    if (!isFilter(condition) || condition.field !== 'createdAt') {
        return condition;
    }

    const date = new Date(condition.value as string);
    if (
        Number.isNaN(date.getTime()) ||
        date.getTime() % 86_400_000 !== 0 ||
        (condition.operator !== 'gte' && condition.operator !== 'lt')
    ) {
        return undefined;
    }

    return condition.operator === 'lt' ?
        lt('date', toDay(date)) :
        gte('date', toDay(date));
}

/**
 * The raw-vocabulary grouped event query onto auth_event_aggregates:
 * `createdAt` becomes `date`, `count()` becomes `sum(count)`. Undefined when
 * an aggregate is anything but `count()` or a bound falls inside a day: the
 * stored counts cannot answer it.
 */
export function translateEventAggregateQuery(query: IQuery): IQuery | undefined {
    const aggregates = query.aggregates?.value ?? [];
    if (aggregates.some((aggregate) => aggregate.lowering?.fn !== 'count' || !!aggregate.lowering.field)) {
        return undefined;
    }

    const filters = translateCondition(query.filters);
    if (!filters) {
        return undefined;
    }

    return new Query({
        filters: filters as Filters,
        groups: new Groups((query.groups?.value ?? []).map((group) => {
            if (group.lowering?.fn !== 'bucket' || group.lowering.field !== 'createdAt') {
                return group;
            }

            return new Group({
                name: 'bucket',
                params: ['date', ...group.lowering.args],
                lowering: {
                    fn: 'bucket', 
                    field: 'date', 
                    args: group.lowering.args, 
                },
            });
        })),
        aggregates: new Aggregates(aggregates.map(() => new Aggregate({
            name: 'sum',
            params: ['count'],
            lowering: {
                fn: 'sum', 
                field: 'count', 
                args: [], 
            },
        }))),
    });
}

/**
 * A rollup row back into the raw vocabulary.
 */
export function translateEventAggregateRow(row: Record<string, unknown>): Record<string, unknown> {
    const {
        date, 
        sumCount, 
        ...rest 
    } = row;

    return {
        ...rest,
        createdAt: date,
        count: sumCount,
    };
}

/**
 * How far back raw events reach for a query, in days (0 = never pruned):
 * entity-CRUD rows expire on their own clock, so a query pinning
 * `scope=entity` reaches the entity retention alone.
 */
export function resolveEventRawHorizonDays(
    query: IQuery,
    retention: { retentionDays: number, entityRetentionDays: number },
): number {
    const entityOnly = readConjuncts(query.filters).some((condition) => isFilter(condition) &&
        condition.field === 'scope' &&
        condition.operator === 'eq' &&
        condition.value === 'entity');

    return Math.max(0, entityOnly ? retention.entityRetentionDays : retention.retentionDays);
}
