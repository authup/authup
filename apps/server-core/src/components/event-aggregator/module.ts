/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Logger } from '@authup/server-kit';
import type { IScheduledComponent } from 'hubwire';
import { defineScheduledComponent } from 'hubwire';
import type { DataSource } from 'typeorm';
import { EventAggregateRepositoryAdapter } from '../../app/modules/database/repositories/index.ts';
import type { IEventAggregateRepository } from '../../core/index.ts';
import { EVENT_AGGREGATE_BACKFILL_DAYS } from '../../core/index.ts';

function shiftDay(day: string, days: number) : string {
    const date = new Date(`${day}T00:00:00.000Z`);

    date.setUTCDate(date.getUTCDate() + days);

    return date.toISOString().slice(0, 10);
}

/**
 * One aggregation pass: recompute today and yesterday, backfill older days
 * toward the oldest raw event, prune past the rollup retention.
 *
 * A day without events yields no rollup rows and so reads as missing
 * forever, which is why the backfill walks a cursor down instead of
 * refilling the newest missing days on every tick. The cursor lives as long
 * as the returned function; a restart walks again, skipping days that
 * already hold rows.
 *
 * An aborted `signal` (the component stopping) ends the pass between two
 * steps: the cursor keeps the days already filled, and the prune waits for
 * the next pass.
 */
export function createEventAggregatorTick(
    repository: IEventAggregateRepository,
    options: { retentionDays: number },
) : (signal?: AbortSignal) => Promise<void> {
    let cursor : string | undefined;

    return async (signal?: AbortSignal) => {
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = shiftDay(today, -1);

        await repository.recompute(today);

        if (signal?.aborted) {
            return;
        }

        await repository.recompute(yesterday);

        if (signal?.aborted) {
            return;
        }

        const horizon = options.retentionDays > 0 ?
            shiftDay(today, -options.retentionDays) :
            undefined;

        let oldest = await repository.findOldestEventDay();

        if (oldest && horizon && oldest < horizon) {
            oldest = horizon;
        }

        const start = cursor && cursor < yesterday ? cursor : shiftDay(yesterday, -1);

        if (oldest && start >= oldest && !signal?.aborted) {
            const present = new Set(await repository.findDays(oldest, start));

            let day = start;
            let filled = 0;

            while (day >= oldest && filled < EVENT_AGGREGATE_BACKFILL_DAYS && !signal?.aborted) {
                if (!present.has(day)) {
                    await repository.recompute(day);
                    filled++;
                }

                day = shiftDay(day, -1);
            }

            cursor = day;
        }

        if (horizon && !signal?.aborted) {
            await repository.deleteBefore(horizon);
        }
    };
}

export function createEventAggregatorComponent(
    dataSource: DataSource,
    options: { retentionDays: number },
    logger?: Logger,
) : IScheduledComponent {
    // the backfill cursor lives as long as the component
    const tick = createEventAggregatorTick(new EventAggregateRepositoryAdapter(dataSource), options);

    // a pass never overlaps the previous one: a tick outlasting the minute
    // skips the next fire instead of queueing another scan of the same days
    return defineScheduledComponent({
        schedule: '* * * * *',
        hooks: {
            onError: (e) => {
                logger?.warn('Component event-aggregator pass failed.');
                logger?.warn(e);
            },
        },
        run: ({ signal }) => tick(signal),
    });
}
