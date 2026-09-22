/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityStatsBucket, StatsGranularity } from '@authup/core-http-kit';
import type { IQuery } from '@rapiq/core';
import type {
    DataSource,
    DatabaseType,
    EntityTarget,
    ObjectLiteral,
    Repository,
} from 'typeorm';
import type { EntityStatsCountGroupedOptions, IEntityStatsRepository } from '../../../../../core/index.ts';
import { applyQuery } from '../query.ts';

/**
 * Grouped counts over any entity table. The filter, the reach and the window
 * ride the query and lower through the same adapter the list uses, so no
 * per-entity code is needed. Rows are counted DISTINCT by id: a filter
 * through a to-many relation (`policy.children`) joins one row per match.
 */
export class EntityStatsRepositoryAdapter<T extends ObjectLiteral> implements IEntityStatsRepository {
    private readonly repository: Repository<T>;

    private readonly alias: string;

    constructor(dataSource: DataSource, target: EntityTarget<T>, alias: string) {
        this.repository = dataSource.getRepository(target);
        this.alias = alias;
    }

    async countGrouped(
        query: IQuery,
        options: EntityStatsCountGroupedOptions,
    ): Promise<EntityStatsBucket<Record<string, any>>[]> {
        const qb = this.repository.createQueryBuilder(this.alias);
        applyQuery(qb, query);

        const bucket = buildBucketExpression(
            this.repository.manager.connection.options.type,
            `${this.alias}.${options.dateColumn}`,
            options.granularity,
        );

        qb.select(bucket, 'bucket');
        for (const key of options.groupBy) {
            qb.addSelect(`${this.alias}.${key}`, key);
        }

        qb.addSelect(`COUNT(DISTINCT ${this.alias}.id)`, 'count')
            .groupBy('bucket');
        for (const key of options.groupBy) {
            qb.addGroupBy(`${this.alias}.${key}`);
        }
        qb.orderBy('bucket', 'ASC');

        const rows = await qb.getRawMany<Record<string, any>>();

        return rows.map((row) => {
            const output: Record<string, any> = {
                bucket: toBucketInstant(row.bucket, options.granularity),
                count: Number(row.count),
            };
            for (const key of options.groupBy) {
                output[key] = row[key];
            }

            return output as EntityStatsBucket<Record<string, any>>;
        });
    }

    async count(query: IQuery): Promise<number> {
        const qb = this.repository.createQueryBuilder(this.alias);
        applyQuery(qb, query);

        return qb.getCount();
    }
}

/**
 * The bucket start as the dialect's own string form (`2026-09-22T10` for an
 * hour, `2026-09-22` for a day), grouped on and turned back into an ISO
 * instant by `toBucketInstant`. Each dialect renders its stored wall clock
 * (assumed UTC, as `countRecent` assumes it) without converting it.
 *
 * ponytail: the one place a per-dialect expression lives; a rapiq group/
 * aggregate parameter with a bucket function (tada5hi/rapiq#938) is the
 * upgrade that moves it into the adapter.
 */
function buildBucketExpression(
    type: DatabaseType,
    column: string,
    granularity: `${StatsGranularity}`,
): string {
    const hourly = granularity === 'hour';

    switch (type) {
        case 'postgres':
            return `to_char(${column}, '${hourly ? 'YYYY-MM-DD"T"HH24' : 'YYYY-MM-DD'}')`;
        case 'mysql':
            return `DATE_FORMAT(${column}, '${hourly ? '%Y-%m-%dT%H' : '%Y-%m-%d'}')`;
        default:
            return `strftime('${hourly ? '%Y-%m-%dT%H' : '%Y-%m-%d'}', ${column})`;
    }
}

function toBucketInstant(bucket: string, granularity: `${StatsGranularity}`): string {
    return granularity === 'hour' ?
        `${bucket}:00:00.000Z` :
        `${bucket}T00:00:00.000Z`;
}
