/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICondition } from '@rapiq/core';
import {
    Aggregate,
    Aggregates,
    Filters,
    Group,
    Groups,
    Query,
    and,
    eq,
    gte,
    lt,
    or,
} from '@rapiq/core';
import { isValidationError } from '@authup/errors';
import { describe, expect, it } from 'vitest';
import { resolveStatsWindow, stripWindowConditions } from '../../../../src/core/stats/index.ts';

const NOW = new Date('2026-09-23T10:30:00.000Z');
const HOUR_IN_MS = 3_600_000;
const DAY_IN_MS = 86_400_000;

function bucket(field: string, unit: string) {
    return new Group({
        name: 'bucket',
        params: [field, unit],
        lowering: {
            fn: 'bucket',
            field,
            args: [unit],
        },
    });
}

function column(field: string) {
    return new Group({
        name: field,
        lowering: {
            fn: undefined,
            field,
            args: [],
        },
    });
}

function build(filter: ICondition | undefined, groups: Group[]) {
    return new Query({
        filters: new Filters('and', filter ? [filter] : []),
        groups: new Groups(groups),
        aggregates: new Aggregates([new Aggregate({
            name: 'count',
            lowering: {
                fn: 'count',
                field: undefined,
                args: [],
            },
        })]),
    });
}

function resolve(filter: ICondition | undefined, groups: Group[], rawHorizonDays?: number) {
    return resolveStatsWindow(build(filter, groups), {
        dateColumn: 'createdAt',
        now: NOW,
        rawHorizonDays,
    });
}

function ago(ms: number): string {
    return new Date(NOW.getTime() - ms).toISOString();
}

function expectRefusal(fn: () => unknown, message: string) {
    try {
        fn();
    } catch (e) {
        expect(isValidationError(e)).toBe(true);
        expect((e as Error).message).toEqual(message);
        return;
    }

    throw new Error('expected a refusal');
}

const RULE_1 = 'The first group must be bucket(createdAt, hour|day|month).';
const RULE_2 = 'The filter must carry a lower bound on createdAt.';

describe('resolveStatsWindow', () => {
    it('requires the first group to bucket the date column', () => {
        const lower = gte('createdAt', ago(DAY_IN_MS));

        expectRefusal(() => resolve(lower, []), RULE_1);
        expectRefusal(() => resolve(lower, [column('scope')]), RULE_1);
        expectRefusal(() => resolve(lower, [bucket('updatedAt', 'day')]), RULE_1);
    });

    it('requires a top-level lower bound on the date column', () => {
        expectRefusal(() => resolve(undefined, [bucket('createdAt', 'day')]), RULE_2);
        expectRefusal(
            () => resolve(or(gte('createdAt', ago(DAY_IN_MS)), eq('name', 'x')), [bucket('createdAt', 'day')]),
            RULE_2,
        );
    });

    it('finds a lower bound nested in top-level ands', () => {
        const window = resolve(
            and(eq('realmId', 'x'), and(gte('createdAt', '2026-09-20T05:00:00.000Z'))),
            [bucket('createdAt', 'day')],
        );

        expect(window.from).toEqual('2026-09-20T00:00:00.000Z');
    });

    it('snaps the lower bound onto a bucket start, the read instant ending the window', () => {
        const window = resolve(gte('createdAt', '2026-08-24T13:00:00Z'), [bucket('createdAt', 'day'), column('scope')]);

        expect(window).toEqual({
            unit: 'day',
            from: '2026-08-24T00:00:00.000Z',
            to: NOW.toISOString(),
            upperBound: false,
            buckets: 31,
        });
    });

    it('ends the window at an explicit upper bound', () => {
        const window = resolve(
            and(gte('createdAt', '2026-09-01T00:00:00.000Z'), lt('createdAt', '2026-09-08T00:00:00.000Z')),
            [bucket('createdAt', 'day')],
        );

        expect(window.to).toEqual('2026-09-08T00:00:00.000Z');
        expect(window.upperBound).toBe(true);
        expect(window.buckets).toEqual(7);
    });

    it('refuses more than 744 buckets', () => {
        const hour = new Date(NOW);
        hour.setUTCMinutes(0, 0, 0);

        expect(resolve(gte('createdAt', new Date(hour.getTime() - (743 * HOUR_IN_MS)).toISOString()), [bucket('createdAt', 'hour')]).buckets)
            .toEqual(744);

        expectRefusal(
            () => resolve(gte('createdAt', new Date(hour.getTime() - (744 * HOUR_IN_MS)).toISOString()), [bucket('createdAt', 'hour')]),
            'The window spans more than 744 buckets.',
        );
    });

    it('counts month buckets from the first of the month', () => {
        const window = resolve(gte('createdAt', '2024-09-23T00:00:00.000Z'), [bucket('createdAt', 'month')]);

        expect(window.from).toEqual('2024-09-01T00:00:00.000Z');
        expect(window.buckets).toEqual(25);
    });

    it('refuses hour buckets past the raw horizon', () => {
        expectRefusal(
            () => resolve(gte('createdAt', ago(8 * DAY_IN_MS)), [bucket('createdAt', 'hour')], 7),
            'Hour buckets reach back 7 days.',
        );

        expect(resolve(gte('createdAt', ago(6 * DAY_IN_MS)), [bucket('createdAt', 'hour')], 7).unit).toEqual('hour');
        expect(resolve(gte('createdAt', ago(8 * DAY_IN_MS)), [bucket('createdAt', 'hour')], 0).unit).toEqual('hour');
        expect(resolve(gte('createdAt', ago(8 * DAY_IN_MS)), [bucket('createdAt', 'day')], 7).unit).toEqual('day');
    });
});

describe('stripWindowConditions', () => {
    it('drops the top-level range conditions on the date column', () => {
        const stripped = stripWindowConditions(
            build(and(gte('createdAt', ago(DAY_IN_MS)), lt('createdAt', NOW.toISOString()), eq('realmId', 'x')), []),
            'createdAt',
        );

        expect(stripped.filters.value).toHaveLength(1);
        expect(stripped.filters.value[0]).toMatchObject({
            operator: 'eq',
            field: 'realmId',
            value: 'x',
        });
        expect(stripped.groups.value).toHaveLength(0);
        expect(stripped.aggregates.value).toHaveLength(0);
    });

    it('keeps a range condition nested in an or', () => {
        const condition = or(gte('createdAt', ago(DAY_IN_MS)), eq('name', 'x'));
        const stripped = stripWindowConditions(build(condition, []), 'createdAt');

        expect(stripped.filters.value).toEqual([condition]);
    });
});
