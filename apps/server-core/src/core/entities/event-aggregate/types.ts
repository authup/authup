/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export interface IEventAggregateRepository {
    /**
     * Replace one UTC day's rollup rows (`YYYY-MM-DD`) with the grouped
     * counts of auth_events.
     */
    recompute(day: string): Promise<void>;

    /**
     * Days in [from, to] (inclusive, `YYYY-MM-DD`) holding at least one
     * rollup row.
     */
    findDays(from: string, to: string): Promise<string[]>;

    /**
     * The oldest UTC day auth_events still holds, or null.
     */
    findOldestEventDay(): Promise<string | null>;

    /**
     * Delete the rollup rows of the days before `before` (exclusive).
     */
    deleteBefore(before: string): Promise<number>;
}
