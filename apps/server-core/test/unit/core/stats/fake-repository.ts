/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityStatsBucket } from '@authup/core-http-kit';
import { applyQuery } from '@rapiq/adapter-memory';
import type { IQuery } from '@rapiq/core';
import type { EntityStatsCountGroupedOptions, IEntityStatsRepository } from '../../../../src/core/index.ts';

export class FakeEntityStatsRepository<T extends Record<string, any>> implements IEntityStatsRepository {
    public rows: T[] = [];

    public countGroupedCalls: Array<{ query: IQuery, options: EntityStatsCountGroupedOptions }> = [];

    public countCalls: IQuery[] = [];

    seed(row: T): T {
        this.rows.push(row);
        return row;
    }

    async countGrouped(
        query: IQuery,
        options: EntityStatsCountGroupedOptions,
    ): Promise<EntityStatsBucket<Record<string, any>>[]> {
        this.countGroupedCalls.push({ query, options });

        const groups = new Map<string, EntityStatsBucket<Record<string, any>>>();
        for (const row of applyQuery(query, this.rows).data) {
            const date = new Date(row[options.dateColumn]);
            if (options.granularity === 'hour') {
                date.setUTCMinutes(0, 0, 0);
            } else {
                date.setUTCHours(0, 0, 0, 0);
            }

            const bucket = date.toISOString();
            const values = Object.fromEntries(options.groupBy.map((key) => [key, row[key]]));
            const key = JSON.stringify([bucket, values]);
            const group = groups.get(key) ?? {
                bucket,
                ...values,
                count: 0,
            };
            group.count += 1;
            groups.set(key, group);
        }

        return groups.values().toArray();
    }

    async count(query: IQuery): Promise<number> {
        this.countCalls.push(query);

        return applyQuery(query, this.rows).data.length;
    }
}
