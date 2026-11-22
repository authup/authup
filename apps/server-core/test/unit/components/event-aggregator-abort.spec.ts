/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { createEventAggregatorTick } from '../../../src/components/index.ts';
import type { IEventAggregateRepository } from '../../../src/core/index.ts';

const TODAY = '2026-06-15';

function shift(day: string, days: number) {
    const date = new Date(`${day}T00:00:00.000Z`);

    date.setUTCDate(date.getUTCDate() + days);

    return date.toISOString().slice(0, 10);
}

type FakeEventAggregateRepository = IEventAggregateRepository & {
    recomputed: string[],
    pruned: string[],
};

function createRepository(oldest: string, onRecompute?: (day: string) => void): FakeEventAggregateRepository {
    const recomputed: string[] = [];
    const pruned: string[] = [];

    return {
        recomputed,
        pruned,
        async recompute(day) {
            recomputed.push(day);
            onRecompute?.(day);
        },
        async findDays() {
            return [];
        },
        async findOldestEventDay() {
            return oldest;
        },
        async findCoverage() {
            return { aggregateFrom: null, entityAggregateFrom: null };
        },
        async deleteBefore(before) {
            pruned.push(before);

            return 0;
        },
    };
}

describe('components/event-aggregator abort', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(`${TODAY}T12:00:00.000Z`));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should run the whole pass without an abort', async () => {
        const repository = createRepository(shift(TODAY, -20));
        const tick = createEventAggregatorTick(repository, { retentionDays: 30 });

        await tick(new AbortController().signal);

        expect(repository.recomputed).toEqual([
            TODAY,
            shift(TODAY, -1),
            ...Array.from({ length: 7 }, (_, i) => shift(TODAY, -2 - i)),
        ]);
        expect(repository.pruned).toEqual([shift(TODAY, -30)]);
    });

    it('should stop the backfill and skip the prune once aborted', async () => {
        const controller = new AbortController();
        const abortAt = shift(TODAY, -4);
        const repository = createRepository(shift(TODAY, -20), (day) => {
            if (day === abortAt) {
                controller.abort();
            }
        });
        const tick = createEventAggregatorTick(repository, { retentionDays: 30 });

        await tick(controller.signal);

        expect(repository.recomputed).toEqual([
            TODAY,
            shift(TODAY, -1),
            shift(TODAY, -2),
            shift(TODAY, -3),
            abortAt,
        ]);
        expect(repository.pruned).toEqual([]);
    });

    it('should resume the backfill after the last day an aborted pass filled', async () => {
        const controller = new AbortController();
        const abortAt = shift(TODAY, -3);
        const repository = createRepository(shift(TODAY, -20), (day) => {
            if (day === abortAt) {
                controller.abort();
            }
        });
        const tick = createEventAggregatorTick(repository, { retentionDays: 0 });

        await tick(controller.signal);

        repository.recomputed.length = 0;

        await tick(new AbortController().signal);

        expect(repository.recomputed).toEqual([
            TODAY,
            shift(TODAY, -1),
            ...Array.from({ length: 7 }, (_, i) => shift(TODAY, -4 - i)),
        ]);
    });

    it('should not start the backfill when aborted during the recompute of today', async () => {
        const controller = new AbortController();
        const repository = createRepository(shift(TODAY, -20), () => controller.abort());
        const tick = createEventAggregatorTick(repository, { retentionDays: 30 });

        await tick(controller.signal);

        expect(repository.recomputed).toEqual([TODAY]);
        expect(repository.pruned).toEqual([]);
    });
});
