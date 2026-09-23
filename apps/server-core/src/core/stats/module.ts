/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ActorContext, ICache } from '@authup/server-kit';
import { eq, lt } from '@rapiq/core';
import type { IQuery } from '@rapiq/core';
import { appendQueryConditions, decodeQuery, queryCodec } from '../query/module.ts';
import { narrowReadScope } from '../query/scope.ts';
import { STATS_CACHE_TTL } from './constants.ts';
import type {
    EntityStatsDefinition,
    EntityStatsReadOptions,
    EntityStatsResult,
    IEntityStatsService,
} from './types.ts';
import { resolveStatsWindow, stripWindowConditions } from './window.ts';

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

    constructor(ctx: EntityStatsServiceContext) {
        this.definition = ctx.definition;
        this.cache = ctx.cache;
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
        options: EntityStatsReadOptions = {},
    ): Promise<EntityStatsResult<G, M>> {
        // no pagination parameter is decoded, so a grouped read returns
        // every group row rather than a page of them
        const parsed = await decodeQuery(query, {
            schema: this.definition.schema,
            parameters: ['filters', 'groups', 'aggregates'],
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

        const dateColumn = this.definition.dateColumn ?? 'createdAt';
        const window = resolveStatsWindow(scoped, {
            dateColumn,
            now: new Date(),
            rawHorizonDays: this.definition.rawHorizonDays?.(),
        });

        // the encoded query is the lowered one, not the wire record: two
        // spellings of one filter share an answer, two reaches do not
        const prefix = [
            'stats',
            this.definition.type,
            actor.identity ? `${actor.identity.type}:${actor.identity.data.id}` : 'anonymous',
        ];
        const key = [...prefix, queryCodec.encode(scoped) ?? ''].join(':');

        const cached = await this.cache.get<EntityStatsResult<G, M>>(key);
        if (cached) {
            return cached;
        }

        // an open window ends at the read instant, appended AFTER the key
        // was taken, since it moves with every request
        const grouped = window.upperBound ?
            scoped :
            appendQueryConditions(scoped, lt(dateColumn, window.to));

        const [rows, total] = await Promise.all([
            this.definition.repository.aggregate(grouped),
            this.countTotal(prefix, stripWindowConditions(scoped, dateColumn)),
        ]);

        const result = {
            data: rows.map((row) => ({
                ...row,
                [dateColumn]: new Date(row[dateColumn] as string).toISOString(),
            })),
            meta: {
                from: window.from,
                to: window.to,
                bucket: window.unit,
                total,
                ...(this.definition.meta ? this.definition.meta() : {}),
            },
        } as EntityStatsResult<G, M>;

        await this.cache.set(key, result, { ttl: STATS_CACHE_TTL });

        return result;
    }

    /**
     * The total ignores the window, so it is cached under the query without
     * it: switching the window or the bucket unit reuses it instead of
     * counting a table like auth_events again.
     */
    protected async countTotal(prefix: string[], query: IQuery): Promise<number> {
        const key = [...prefix, queryCodec.encode(query) ?? '', 'total'].join(':');
        const cached = await this.cache.get<number>(key);
        if (typeof cached === 'number') {
            return cached;
        }

        const total = await this.definition.repository.count(query);
        await this.cache.set(key, total, { ttl: STATS_CACHE_TTL });

        return total;
    }
}
