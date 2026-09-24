/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IQuery } from '@rapiq/core';
import type {
    DataSource,
    EntityTarget,
    ObjectLiteral,
    Repository,
} from 'typeorm';
import type { IEntityStatsRepository } from '../../../../../core/index.ts';
import { applyGroupedQuery, applyQuery } from '../query.ts';

/**
 * Grouped counts over any entity table. The filter, the reach, the window
 * and the grouping ride the query and lower through rapiq's adapter, the
 * bucket expression included, so no per-entity or per-dialect code is
 * needed.
 */
export class EntityStatsRepositoryAdapter<T extends ObjectLiteral> implements IEntityStatsRepository {
    private readonly repository: Repository<T>;

    private readonly alias: string;

    constructor(dataSource: DataSource, target: EntityTarget<T>, alias: string) {
        this.repository = dataSource.getRepository(target);
        this.alias = alias;
    }

    async aggregate(query: IQuery): Promise<Record<string, unknown>[]> {
        const qb = this.repository.createQueryBuilder(this.alias);
        const { normalize } = applyGroupedQuery(qb, query);

        return normalize(await qb.getRawMany());
    }

    async count(query: IQuery): Promise<number> {
        const qb = this.repository.createQueryBuilder(this.alias);
        applyQuery(qb, query);

        return qb.getCount();
    }
}
