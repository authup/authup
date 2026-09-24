/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { applyGroupedQuery, applyQuery } from '@rapiq/adapter-memory';
import type { IQuery } from '@rapiq/core';
import type { IEntityStatsRepository } from '../../../../src/core/index.ts';

export class FakeEntityStatsRepository<T extends Record<string, any>> implements IEntityStatsRepository {
    public rows: T[] = [];

    public aggregateCalls: IQuery[] = [];

    public countCalls: IQuery[] = [];

    seed(row: T): T {
        this.rows.push(row);
        return row;
    }

    async aggregate(query: IQuery): Promise<Record<string, unknown>[]> {
        this.aggregateCalls.push(query);

        return applyGroupedQuery(query, this.rows).data;
    }

    async count(query: IQuery): Promise<number> {
        this.countCalls.push(query);

        return applyQuery(query, this.rows).data.length;
    }
}
