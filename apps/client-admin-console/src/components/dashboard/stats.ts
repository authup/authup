/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EventName, EventScope } from '@authup/core-kit';
import type { EntityStatsRow, EventStatsMeta, EventStatsRow } from '@authup/core-http-kit';

export type EventStatsRank = {
    scope: `${EventScope}`,
    name: `${EventName}`,
    count: number,
};

/**
 * Every bucket start from the window start through the bucket holding the
 * window end, so a chart renders an empty bucket as a zero rather than a gap.
 */
export function buildBucketAxis(meta: Pick<EventStatsMeta, 'from' | 'to' | 'bucket'>): string[] {
    const end = new Date(meta.to).getTime();
    const axis: string[] = [];

    for (const at = new Date(meta.from); at.getTime() <= end;) {
        axis.push(at.toISOString());
        if (meta.bucket === 'hour') {
            at.setUTCHours(at.getUTCHours() + 1);
        } else if (meta.bucket === 'day') {
            at.setUTCDate(at.getUTCDate() + 1);
        } else {
            at.setUTCMonth(at.getUTCMonth() + 1);
        }
    }

    return axis;
}

/**
 * Every row's counts aligned onto the axis, zero where the window has no
 * row: the whole of what a group-less entity read answers, and one group's
 * share of a grouped one once the caller narrowed the rows.
 */
export function alignStats(data: Pick<EntityStatsRow, 'createdAt' | 'count'>[], axis: string[]): number[] {
    const byBucket = new Map<string, number>();
    for (const row of data) {
        byBucket.set(row.createdAt, (byBucket.get(row.createdAt) ?? 0) + row.count);
    }

    return axis.map((bucket) => byBucket.get(bucket) ?? 0);
}

/**
 * The rows created inside the window, whatever they are grouped by.
 */
export function sumStats(data: Pick<EntityStatsRow, 'count'>[]): number {
    return data.reduce((sum, row) => sum + row.count, 0);
}

/**
 * One event type's counts aligned onto the axis, zero where it has no row.
 */
export function alignEventStats(data: EventStatsRow[], axis: string[], name: `${EventName}`): number[] {
    return alignStats(data.filter((row) => row.name === name), axis);
}

export function sumEventStats(data: EventStatsRow[], name?: `${EventName}`): number {
    return sumStats(name ? data.filter((row) => row.name === name) : data);
}

/**
 * The window's totals per (scope, name), largest first.
 */
export function rankEventStats(data: EventStatsRow[]): EventStatsRank[] {
    // the ranks are collected in an array as they appear rather than read
    // back out of the map: Map#values().toArray() is an Iterator Helpers
    // method the console's browser floor (Safari 16.4) does not have
    const totals = new Map<string, EventStatsRank>();
    const ranks : EventStatsRank[] = [];
    for (const row of data) {
        const key = `${row.scope}:${row.name}`;
        let entry = totals.get(key);
        if (!entry) {
            entry = {
                scope: row.scope,
                name: row.name,
                count: 0,
            };
            totals.set(key, entry);
            ranks.push(entry);
        }
        entry.count += row.count;
    }

    return ranks.sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name));
}
