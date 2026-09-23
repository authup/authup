/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ValidationError } from '@authup/errors';
import type { ActorContext, ICache } from '@authup/server-kit';
import { 
    eq, 
    isFilter, 
    isFilters, 
    lt, 
} from '@rapiq/core';
import type { ICondition, IQuery } from '@rapiq/core';
import { appendQueryConditions, decodeQuery, queryCodec } from '../query/module.ts';
import { narrowReadScope } from '../query/scope.ts';
import { STATS_CACHE_TTL } from './constants.ts';
import type {
    EntityStatsDefinition,
    EntityStatsReadOptions,
    EntityStatsResult,
    IEntityStatsService,
} from './types.ts';
import { isPastRawHorizon, resolveStatsWindow, stripWindowConditions } from './window.ts';

function collectFields(condition: ICondition, output: Set<string>): void {
    if (isFilters(condition)) {
        condition.value.forEach((child) => collectFields(child, output));
    } else if (isFilter(condition)) {
        output.add(condition.field);
    }
}

/**
 * Every column a grouped query reads: filter leaves, groups, aggregates.
 */
function readReferencedColumns(query: IQuery): string[] {
    const output = new Set<string>();
    collectFields(query.filters, output);

    for (const group of query.groups?.value ?? []) {
        output.add(group.lowering?.field ?? group.key);
    }

    for (const aggregate of query.aggregates?.value ?? []) {
        if (aggregate.lowering?.field) {
            output.add(aggregate.lowering.field);
        }
    }

    return [...output];
}

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
        const now = new Date();
        const rawHorizonDays = this.definition.rawHorizonDays?.(scoped);
        const window = resolveStatsWindow(scoped, {
            dateColumn,
            now,
            rawHorizonDays,
        });

        // an open window ends at the read instant, appended after the cache
        // key is taken below, since it moves with every request
        const grouped = window.upperBound ?
            scoped :
            appendQueryConditions(scoped, lt(dateColumn, window.to));

        // routed by the query's shape after the gate: a reach lowered onto
        // a column the rollup did not store (an actor's own actorId) reads
        // raw rows, whatever the caller asked for
        const { rollup } = this.definition;
        const routable = rollup &&
            readReferencedColumns(scoped).every((column) => rollup.columns.includes(column)) ?
            rollup.translate(grouped) :
            undefined;
        const translated = window.unit !== 'hour' ? routable : undefined;

        if (!translated && window.unit !== 'hour' && isPastRawHorizon(window, rawHorizonDays, now)) {
            throw new ValidationError(`This filter reaches back past ${rawHorizonDays} days; rollups cannot answer it.`);
        }

        // the encoded query is the lowered one, not the wire record: two
        // spellings of one filter share an answer, two reaches do not
        const prefix = [
            'stats',
            this.definition.type,
            actor.identity ? `${actor.identity.type}:${actor.identity.data.id}` : 'anonymous',
        ];
        const key = [
            ...prefix,
            ...(translated ? ['rollup'] : []),
            queryCodec.encode(scoped) ?? '',
        ].join(':');

        const cached = await this.cache.get<EntityStatsResult<G, M>>(key);
        if (cached) {
            return cached;
        }

        const [rows, total] = await Promise.all([
            rollup && translated ?
                rollup.repository.aggregate(translated).then((output) => output.map((row) => rollup.translateRow(row))) :
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
                // the horizon a day read of this scope reaches, also on an
                // hour read: the window switch gates the longer windows on it
                ...(rollup && routable && rollup.meta ? rollup.meta() : {}),
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
