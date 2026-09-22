/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { StatsGranularity } from '@authup/core-http-kit';
import { ValidationError } from '@authup/errors';
import type { ActorContext, ICache } from '@authup/server-kit';
import { eq, gte, lt } from '@rapiq/core';
import type { IQuery } from '@rapiq/core';
import { appendQueryConditions, decodeQuery, queryCodec } from '../query/module.ts';
import { narrowReadScope } from '../query/scope.ts';
import { STATS_CACHE_TTL, STATS_DAYS_DEFAULT, STATS_MAX_BUCKETS } from './constants.ts';
import type {
    EntityStatsDefinition,
    EntityStatsReadOptions,
    EntityStatsResult,
    IEntityStatsService,
} from './types.ts';
import { EntityStatsParametersValidator } from './validator.ts';

const HOUR_IN_MS = 3_600_000;
const DAY_IN_MS = 86_400_000;

export type EntityStatsServiceContext = {
    definition: EntityStatsDefinition,
    cache: ICache,
};

export class EntityStatsService<
    G extends Record<string, any> = Record<string, unknown>,
    M extends Record<string, any> = Record<string, unknown>,
> implements IEntityStatsService<G, M> {
    protected definition: EntityStatsDefinition;

    protected cache: ICache;

    protected validator: EntityStatsParametersValidator;

    constructor(ctx: EntityStatsServiceContext) {
        this.definition = ctx.definition;
        this.cache = ctx.cache;
        this.validator = new EntityStatsParametersValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
        options: EntityStatsReadOptions = {},
    ): Promise<EntityStatsResult<G, M>> {
        const parameters = await this.validator.run(query);
        const granularity = parameters.granularity ?? StatsGranularity.DAY;
        const days = parameters.days ?? STATS_DAYS_DEFAULT;
        const bucketsPerDay = granularity === StatsGranularity.HOUR ? 24 : 1;
        if (days * bucketsPerDay > STATS_MAX_BUCKETS) {
            throw new ValidationError(`The window spans more than ${STATS_MAX_BUCKETS} buckets.`);
        }

        const parsed = await decodeQuery(query, {
            schema: this.definition.schema,
            parameters: ['filters'],
            actor,
        });

        // the whole gate runs before the cache lookup, and the key carries
        // what it produced: reach is a property of the REQUEST (a token
        // narrowed to its client, a bearer without `global`), not of the
        // identity, so two requests by one identity can lower to different
        // queries and one must never read the other's answer
        let scoped = this.definition.scope ?
            narrowReadScope(await this.definition.scope(parsed, actor)) :
            parsed;

        const realmColumn = this.definition.realmColumn === undefined ?
            'realmId' :
            this.definition.realmColumn;
        if (realmColumn && options.realmId) {
            scoped = appendQueryConditions(scoped, eq(realmColumn, options.realmId));
        }

        // the encoded query is the lowered one, not the wire record: two
        // spellings of one filter share an answer, two reaches do not
        const scope = [
            'stats',
            this.definition.type,
            actor.identity ? `${actor.identity.type}:${actor.identity.data.id}` : 'anonymous',
            queryCodec.encode(scoped) ?? '',
        ];
        const key = [...scope, granularity, days].join(':');

        const cached = await this.cache.get<EntityStatsResult<G, M>>(key);
        if (cached) {
            return cached;
        }

        // one half-open window of exactly days * bucketsPerDay bucket
        // starts, the last of them the bucket holding `to`, appended AFTER
        // the key was taken, since `to` moves with every request
        const dateColumn = this.definition.dateColumn ?? 'createdAt';
        const now = new Date();
        const to = now.toISOString();
        const width = granularity === StatsGranularity.HOUR ? HOUR_IN_MS : DAY_IN_MS;
        const from = new Date(
            new Date(snapToBucket(now, granularity)).getTime() - (((days * bucketsPerDay) - 1) * width),
        ).toISOString();

        const [data, total] = await Promise.all([
            this.definition.repository.countGrouped(
                appendQueryConditions(scoped, gte(dateColumn, from), lt(dateColumn, to)),
                {
                    granularity,
                    dateColumn,
                    groupBy: this.definition.groupBy ?? [],
                },
            ),
            this.countTotal(scope.join(':'), scoped),
        ]);

        const result = {
            data,
            meta: {
                from,
                to,
                granularity,
                days,
                total,
                ...(this.definition.meta ? this.definition.meta() : {}),
            },
        } as EntityStatsResult<G, M>;

        await this.cache.set(key, result, { ttl: STATS_CACHE_TTL });

        return result;
    }

    /**
     * The total ignores the window, so it is cached under the scope alone:
     * switching the window reuses it instead of counting a table like
     * auth_events again.
     */
    protected async countTotal(key: string, query: IQuery): Promise<number> {
        const totalKey = `${key}:total`;
        const cached = await this.cache.get<number>(totalKey);
        if (typeof cached === 'number') {
            return cached;
        }

        const total = await this.definition.repository.count(query);
        await this.cache.set(totalKey, total, { ttl: STATS_CACHE_TTL });

        return total;
    }
}

function snapToBucket(input: Date, granularity: `${StatsGranularity}`): string {
    const date = new Date(input);
    if (granularity === StatsGranularity.HOUR) {
        date.setUTCMinutes(0, 0, 0);
    } else {
        date.setUTCHours(0, 0, 0, 0);
    }

    return date.toISOString();
}
