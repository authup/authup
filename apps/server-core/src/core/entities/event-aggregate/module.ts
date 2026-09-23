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
    lte,
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
 * A rollup answers whole days: the day holding a bound is included whole,
 * so a bound is widened onto the day boundary around it.
 */
function translateCondition(condition: ICondition): ICondition {
    if (isFilters(condition)) {
        return new Filters(
            condition.operator,
            condition.value.map((child) => translateCondition(child)),
            { preserved: condition.preserved },
        );
    }

    if (!isFilter(condition) || condition.field !== 'createdAt') {
        return condition;
    }

    const date = new Date(condition.value as string);
    if (condition.operator === 'lt') {
        const start = new Date(`${toDay(date)}T00:00:00.000Z`);
        if (start.getTime() < date.getTime()) {
            start.setUTCDate(start.getUTCDate() + 1);
        }

        return lt('day', toDay(start));
    }

    if (condition.operator === 'lte') {
        return lte('day', toDay(date));
    }

    // gte, gt: the timestamp filters gate admits range operators only
    return gte('day', toDay(date));
}

/**
 * The raw-vocabulary grouped event query onto auth_event_aggregates:
 * `createdAt` becomes `day`, `count()` becomes `sum(count)`. Undefined when
 * an aggregate is anything but `count()`: a stored count cannot answer it.
 */
export function translateEventAggregateQuery(query: IQuery): IQuery | undefined {
    const aggregates = query.aggregates?.value ?? [];
    if (aggregates.some((aggregate) => aggregate.lowering?.fn !== 'count' || !!aggregate.lowering.field)) {
        return undefined;
    }

    return new Query({
        filters: translateCondition(query.filters) as Filters,
        groups: new Groups((query.groups?.value ?? []).map((group) => {
            if (group.lowering?.fn !== 'bucket' || group.lowering.field !== 'createdAt') {
                return group;
            }

            return new Group({
                name: 'bucket',
                params: ['day', ...group.lowering.args],
                lowering: {
                    fn: 'bucket', 
                    field: 'day', 
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
        day, 
        sumCount, 
        ...rest 
    } = row;

    return {
        ...rest,
        createdAt: day,
        count: sumCount,
    };
}

/**
 * How far back raw events reach for a query, in days (0 = never pruned):
 * entity-CRUD rows expire on their own clock, so a query pinning
 * `scope=entity` reaches the shorter of the two.
 */
export function resolveEventRawHorizonDays(
    query: IQuery,
    retention: { retentionDays: number, entityRetentionDays: number },
): number {
    const entityOnly = readConjuncts(query.filters).some((condition) => isFilter(condition) &&
        condition.field === 'scope' &&
        condition.operator === 'eq' &&
        condition.value === 'entity');

    const days = (entityOnly ?
        [retention.retentionDays, retention.entityRetentionDays] :
        [retention.retentionDays]).filter((value) => value > 0);

    return days.length > 0 ? Math.min(...days) : 0;
}
