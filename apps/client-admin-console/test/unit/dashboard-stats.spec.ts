/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventName, EventScope } from '@authup/core-kit';
import type { EventStatsRow } from '@authup/core-http-kit';
import { describe, expect, it } from 'vitest';
import {
    alignEventStats,
    alignStats,
    buildBucketAxis,
    rankEventStats,
    sumEventStats,
    sumStats,
} from '../../src/components/dashboard/stats';

function row(createdAt: string, name: `${EventName}`, count: number, scope: `${EventScope}` = EventScope.OAUTH2): EventStatsRow {
    return {
        createdAt,
        scope,
        name,
        count,
    };
}

describe('src/components/dashboard/stats', () => {
    describe('buildBucketAxis', () => {
        it('walks day buckets from the window start through the bucket holding its end', () => {
            expect(buildBucketAxis({
                from: '2026-09-20T00:00:00.000Z',
                to: '2026-09-22T10:15:00.000Z',
                bucket: 'day',
            })).toEqual([
                '2026-09-20T00:00:00.000Z',
                '2026-09-21T00:00:00.000Z',
                '2026-09-22T00:00:00.000Z',
            ]);
        });

        it('walks hour buckets', () => {
            expect(buildBucketAxis({
                from: '2026-09-22T10:00:00.000Z',
                to: '2026-09-22T12:30:00.000Z',
                bucket: 'hour',
            })).toEqual([
                '2026-09-22T10:00:00.000Z',
                '2026-09-22T11:00:00.000Z',
                '2026-09-22T12:00:00.000Z',
            ]);
        });

        it('walks month buckets', () => {
            expect(buildBucketAxis({
                from: '2026-07-01T00:00:00.000Z',
                to: '2026-09-22T10:00:00.000Z',
                bucket: 'month',
            })).toEqual([
                '2026-07-01T00:00:00.000Z',
                '2026-08-01T00:00:00.000Z',
                '2026-09-01T00:00:00.000Z',
            ]);
        });

        it('answers the single bucket of a window that ends where it starts', () => {
            expect(buildBucketAxis({
                from: '2026-09-22T10:00:00.000Z',
                to: '2026-09-22T10:00:00.000Z',
                bucket: 'hour',
            })).toEqual(['2026-09-22T10:00:00.000Z']);
        });
    });

    describe('alignStats', () => {
        it('sums every row per bucket and zero-fills the rest of the axis', () => {
            const axis = [
                '2026-09-20T00:00:00.000Z',
                '2026-09-21T00:00:00.000Z',
                '2026-09-22T00:00:00.000Z',
            ];

            expect(alignStats([
                { createdAt: '2026-09-20T00:00:00.000Z', count: 3 },
                { createdAt: '2026-09-20T00:00:00.000Z', count: 2 },
                { createdAt: '2026-09-22T00:00:00.000Z', count: 1 },
                { createdAt: '2026-09-19T00:00:00.000Z', count: 7 },
            ], axis)).toEqual([5, 0, 1]);
        });

        it('answers zeros for an empty window', () => {
            expect(alignStats([], ['2026-09-20T00:00:00.000Z', '2026-09-21T00:00:00.000Z'])).toEqual([0, 0]);
        });
    });

    describe('sumStats', () => {
        it('totals every row whatever it is grouped by', () => {
            expect(sumStats([
                row('2026-09-20T00:00:00.000Z', EventName.LOGIN, 3),
                { count: 4 },
            ])).toEqual(7);
            expect(sumStats([])).toEqual(0);
        });
    });

    describe('alignEventStats', () => {
        it('zero-fills the buckets one event type is absent from', () => {
            const axis = [
                '2026-09-20T00:00:00.000Z',
                '2026-09-21T00:00:00.000Z',
                '2026-09-22T00:00:00.000Z',
            ];

            expect(alignEventStats([
                row('2026-09-20T00:00:00.000Z', EventName.LOGIN, 3),
                row('2026-09-22T00:00:00.000Z', EventName.LOGIN, 1),
                row('2026-09-21T00:00:00.000Z', EventName.LOGIN_FAILED, 5),
            ], axis, EventName.LOGIN)).toEqual([3, 0, 1]);
        });

        it('ignores a bucket outside the axis', () => {
            expect(alignEventStats([
                row('2026-09-19T00:00:00.000Z', EventName.LOGIN, 3),
            ], ['2026-09-20T00:00:00.000Z'], EventName.LOGIN)).toEqual([0]);
        });
    });

    describe('sumEventStats', () => {
        const data = [
            row('2026-09-20T00:00:00.000Z', EventName.LOGIN, 3),
            row('2026-09-21T00:00:00.000Z', EventName.LOGIN, 4),
            row('2026-09-21T00:00:00.000Z', EventName.LOGIN_FAILED, 2),
            row('2026-09-21T00:00:00.000Z', EventName.CREATED, 9, EventScope.ENTITY),
        ];

        it('totals one event type over the window', () => {
            expect(sumEventStats(data, EventName.LOGIN)).toEqual(7);
            expect(sumEventStats(data, EventName.AUTHORIZE)).toEqual(0);
        });

        it('totals every row without a name', () => {
            expect(sumEventStats(data)).toEqual(18);
        });
    });

    describe('rankEventStats', () => {
        it('totals each (scope, name) over the window, largest first, ties by name', () => {
            expect(rankEventStats([
                row('2026-09-20T00:00:00.000Z', EventName.LOGIN, 3),
                row('2026-09-21T00:00:00.000Z', EventName.LOGIN, 4),
                row('2026-09-21T00:00:00.000Z', EventName.LOGIN_FAILED, 2),
                row('2026-09-21T00:00:00.000Z', EventName.AUTHORIZE, 2),
                row('2026-09-21T00:00:00.000Z', EventName.CREATED, 9, EventScope.ENTITY),
            ])).toEqual([
                {
                    scope: EventScope.ENTITY, 
                    name: EventName.CREATED, 
                    count: 9, 
                },
                {
                    scope: EventScope.OAUTH2, 
                    name: EventName.LOGIN, 
                    count: 7, 
                },
                {
                    scope: EventScope.OAUTH2, 
                    name: EventName.AUTHORIZE, 
                    count: 2, 
                },
                {
                    scope: EventScope.OAUTH2, 
                    name: EventName.LOGIN_FAILED, 
                    count: 2, 
                },
            ]);
        });
    });
});
