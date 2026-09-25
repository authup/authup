/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ScheduledTask } from 'node-cron';
import cron from 'node-cron';
import type { Logger } from '@authup/server-kit';
import type { DataSource } from 'typeorm';
import { EventAggregateRepositoryAdapter } from '../../app/modules/database/repositories/index.ts';
import type { IEventAggregateRepository } from '../../core/index.ts';
import { EVENT_AGGREGATE_BACKFILL_DAYS } from '../../core/index.ts';
import type { Component } from '../types.ts';

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
 */
export function createEventAggregatorTick(
    repository: IEventAggregateRepository,
    options: { retentionDays: number },
) : () => Promise<void> {
    let cursor : string | undefined;

    return async () => {
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = shiftDay(today, -1);

        await repository.recompute(today);
        await repository.recompute(yesterday);

        const horizon = options.retentionDays > 0 ?
            shiftDay(today, -options.retentionDays) :
            undefined;

        let oldest = await repository.findOldestEventDay();
        if (oldest && horizon && oldest < horizon) {
            oldest = horizon;
        }

        const start = cursor && cursor < yesterday ? cursor : shiftDay(yesterday, -1);
        if (oldest && start >= oldest) {
            const present = new Set(await repository.findDays(oldest, start));

            let day = start;
            let filled = 0;
            while (day >= oldest && filled < EVENT_AGGREGATE_BACKFILL_DAYS) {
                if (!present.has(day)) {
                    await repository.recompute(day);
                    filled++;
                }

                day = shiftDay(day, -1);
            }

            cursor = day;
        }

        if (horizon) {
            await repository.deleteBefore(horizon);
        }
    };
}

export function createEventAggregatorComponent(
    dataSource: DataSource,
    options: { retentionDays: number },
    logger?: Logger,
) : Component {
    let task : ScheduledTask | undefined;
    let stopped = false;
    let lastSuccessAt : number | undefined;

    return {
        async start() {
            const tick = createEventAggregatorTick(new EventAggregateRepositoryAdapter(dataSource), options);

            // a failed pass must never take the process down (start() is
            // fire-and-forget); the next tick retries
            const execute = async () => {
                try {
                    await tick();
                    lastSuccessAt = Date.now();
                } catch (e) {
                    logger?.warn('Aggregating audit events failed.');
                    logger?.warn(e);
                }
            };

            await execute();

            if (stopped) {
                return;
            }

            // a tick outlasting the minute must not queue another scan of
            // the same days behind it: the next fire is skipped instead
            task = cron.schedule('* * * * *', async () => {
                await execute();
            }, { noOverlap: true });
        },
        async stop() {
            stopped = true;

            if (task) {
                await task.stop();
                task = undefined;
            }
        },
        lastSuccessAt: () => lastSuccessAt,
    };
}
