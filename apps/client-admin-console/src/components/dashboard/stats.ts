/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EventName, EventScope } from '@authup/core-kit';
import type { EventStatsBucket, EventStatsMeta } from '@authup/core-http-kit';

const HOUR_IN_MS = 3_600_000;
const DAY_IN_MS = 86_400_000;

export type EventStatsRank = {
    scope: `${EventScope}`,
    name: `${EventName}`,
    count: number,
};

/**
 * Every bucket start from the window start through the bucket holding the
 * window end, so a chart renders an empty bucket as a zero rather than a gap.
 */
export function buildBucketAxis(meta: Pick<EventStatsMeta, 'from' | 'to' | 'granularity'>): string[] {
    const step = meta.granularity === 'hour' ? HOUR_IN_MS : DAY_IN_MS;
    const end = new Date(meta.to).getTime();
    const axis: string[] = [];

    for (let at = new Date(meta.from).getTime(); at <= end; at += step) {
        axis.push(new Date(at).toISOString());
    }

    return axis;
}

/**
 * One event type's counts aligned onto the axis, zero where it has no row.
 */
export function alignEventStats(data: EventStatsBucket[], axis: string[], name: `${EventName}`): number[] {
    const byBucket = new Map<string, number>();
    for (const row of data) {
        if (row.name === name) {
            byBucket.set(row.bucket, (byBucket.get(row.bucket) ?? 0) + row.count);
        }
    }

    return axis.map((bucket) => byBucket.get(bucket) ?? 0);
}

export function sumEventStats(data: EventStatsBucket[], name?: `${EventName}`): number {
    return data.reduce((sum, row) => (name && row.name !== name ? sum : sum + row.count), 0);
}

/**
 * The window's totals per (scope, name), largest first.
 */
export function rankEventStats(data: EventStatsBucket[]): EventStatsRank[] {
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
