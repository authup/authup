/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ValidationError } from '@authup/errors';
import type { ICondition, IQuery } from '@rapiq/core';
import {
    Filters,
    Query,
    isBucketUnit,
    isFilter,
    isFilters,
} from '@rapiq/core';
import { STATS_MAX_BUCKETS } from './constants.ts';
import type { StatsWindow, StatsWindowOptions } from './types.ts';

const DAY_IN_MS = 86_400_000;

const LOWER_BOUND_OPERATORS = ['gte', 'gt'];
const UPPER_BOUND_OPERATORS = ['lte', 'lt'];

/**
 * The top-level AND conjuncts of a filter tree: nested `and` groups are
 * flattened, anything else (an `or`, a `not`) is one conjunct.
 */
export function readConjuncts(condition: ICondition): ICondition[] {
    if (isFilters(condition, 'and')) {
        return condition.value.flatMap((child) => readConjuncts(child));
    }

    return [condition];
}

function isRangeCondition(condition: ICondition, field: string, operators: string[]): boolean {
    return isFilter(condition) &&
        condition.field === field &&
        operators.includes(condition.operator);
}

function readBound(conjuncts: ICondition[], field: string, operators: string[]): Date[] {
    return conjuncts
        .filter((condition) => isRangeCondition(condition, field, operators))
        .map((condition) => new Date(condition.value as string))
        .filter((date) => !Number.isNaN(date.getTime()));
}

function snap(input: Date, unit: StatsWindow['unit']): Date {
    const date = new Date(input);
    date.setUTCMinutes(0, 0, 0);
    if (unit !== 'hour') {
        date.setUTCHours(0);
    }
    if (unit === 'month') {
        date.setUTCDate(1);
    }

    return date;
}

function advance(input: Date, unit: StatsWindow['unit']): Date {
    const date = new Date(input);
    if (unit === 'hour') {
        date.setUTCHours(date.getUTCHours() + 1);
    } else if (unit === 'day') {
        date.setUTCDate(date.getUTCDate() + 1);
    } else {
        date.setUTCMonth(date.getUTCMonth() + 1);
    }

    return date;
}

/**
 * The window of a decoded grouped query, after authup's four rules: the
 * first group buckets the date column, a top-level lower bound on it
 * exists, the window spans at most `STATS_MAX_BUCKETS` buckets, and an
 * hour bucket stays inside the raw horizon. Each refusal is a
 * ValidationError naming the rule.
 */
export function resolveStatsWindow(query: IQuery, options: StatsWindowOptions): StatsWindow {
    const { dateColumn, now } = options;

    const [group] = query.groups?.value ?? [];
    const unit = group?.lowering?.args[0];
    if (
        !group ||
        group.lowering?.fn !== 'bucket' ||
        group.lowering.field !== dateColumn ||
        !isBucketUnit(unit)
    ) {
        throw new ValidationError(`The first group must be bucket(${dateColumn}, hour|day|month).`);
    }

    const conjuncts = readConjuncts(query.filters);
    const lowerBounds = readBound(conjuncts, dateColumn, LOWER_BOUND_OPERATORS);
    if (lowerBounds.length === 0) {
        throw new ValidationError(`The filter must carry a lower bound on ${dateColumn}.`);
    }

    const upperBounds = readBound(conjuncts, dateColumn, UPPER_BOUND_OPERATORS);

    const from = snap(new Date(Math.max(...lowerBounds.map((date) => date.getTime()))), unit);
    const to = upperBounds.length > 0 ?
        new Date(Math.min(...upperBounds.map((date) => date.getTime()))) :
        now;

    let buckets = 0;
    for (let start = from; start < to; start = advance(start, unit)) {
        buckets++;
        if (buckets > STATS_MAX_BUCKETS) {
            throw new ValidationError(`The window spans more than ${STATS_MAX_BUCKETS} buckets.`);
        }
    }

    const { rawHorizonDays } = options;
    if (
        unit === 'hour' &&
        rawHorizonDays &&
        rawHorizonDays > 0 &&
        from.getTime() < now.getTime() - (rawHorizonDays * DAY_IN_MS)
    ) {
        throw new ValidationError(`Hour buckets reach back ${rawHorizonDays} days.`);
    }

    return {
        unit,
        from: from.toISOString(),
        to: to.toISOString(),
        upperBound: upperBounds.length > 0,
        buckets,
    };
}

/**
 * Whether a window reaches past the raw horizon (days, 0 = never pruned).
 * The horizon is snapped onto the start of its hour or day, so a window
 * reaching back exactly the horizon is tolerated up to that bucket. A month
 * is never tolerated: its first bucket would silently miss the pruned days
 * of that month, so a month window is held to the horizon's day.
 */
export function isPastRawHorizon(window: StatsWindow, horizonDays: number | undefined, now: Date): boolean {
    if (!horizonDays || horizonDays <= 0) {
        return false;
    }

    const unit = window.unit === 'month' ? 'day' : window.unit;

    return new Date(window.from) < snap(new Date(now.getTime() - (horizonDays * DAY_IN_MS)), unit);
}

/**
 * The record query behind a grouped one, without its top-level range
 * conditions on the date column (the window). A range nested in an `or`
 * stays, so it keeps narrowing. Groups and aggregates are dropped: what is
 * left counts rows.
 */
export function stripWindowConditions(query: IQuery, dateColumn: string): Query {
    const conjuncts = readConjuncts(query.filters).filter(
        (condition) => !isRangeCondition(
            condition,
            dateColumn,
            [...LOWER_BOUND_OPERATORS, ...UPPER_BOUND_OPERATORS],
        ),
    );

    return new Query({
        fields: query.fields,
        filters: new Filters('and', conjuncts),
        relations: query.relations,
        pagination: query.pagination,
        sorts: query.sorts,
    });
}
