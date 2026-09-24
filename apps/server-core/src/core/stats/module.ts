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
    not,
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
    StatsWindow,
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
        const gate = this.definition.scope ?
            await this.definition.scope(parsed, actor) :
            undefined;

        let base = parsed;
        const realmColumn = this.definition.realmColumn === undefined ?
            'realmId' :
            this.definition.realmColumn;
        if (realmColumn && options.realmId) {
            base = appendQueryConditions(base, eq(realmColumn, options.realmId));
        }

        let scoped = base;
        if (gate) {
            scoped = narrowReadScope(gate);
            if (realmColumn && options.realmId) {
                scoped = appendQueryConditions(scoped, eq(realmColumn, options.realmId));
            }
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
        const bound = (query: IQuery) => (window.upperBound ?
            query :
            appendQueryConditions(query, lt(dateColumn, window.to)));

        // routed by the query's shape after the gate: a reach lowered onto
        // a column the rollup did not store (an actor's own actorId) reads
        // raw rows, whatever the caller asked for
        let translated = this.translate(scoped, window, now);

        // a reach ORed with the ownership term (actorId, not stored) splits:
        // the reach from the rollups, the actor's own rows outside it raw,
        // which only raw events hold, so that half is bounded by the raw
        // retention by nature
        let own: IQuery | undefined;
        if (!this.isRoutable(scoped) && gate?.reach && gate.ownership) {
            const reached = appendQueryConditions(base, gate.reach);
            translated = this.translate(reached, window, now);
            if (translated) {
                own = appendQueryConditions(base, gate.ownership, not(gate.reach));
            }
        }

        if (!translated && window.unit !== 'hour' && isPastRawHorizon(window, rawHorizonDays, now)) {
            throw new ValidationError(`This filter reaches back past ${rawHorizonDays} days; rollups cannot answer it.`);
        }

        // the encoded query is the lowered one, not the wire record: two
        // spellings of one filter share an answer, two reaches do not; it
        // carries both the reach and the ownership term, so it covers both
        // halves of a split read
        const prefix = [
            'stats',
            this.definition.type,
            actor.identity ? `${actor.identity.type}:${actor.identity.data.id}` : 'anonymous',
        ];
        const key = [
            ...prefix,
            ...(translated ? ['rollup'] : []),
            ...(own ? ['split'] : []),
            queryCodec.encode(scoped) ?? '',
        ].join(':');

        const cached = await this.cache.get<EntityStatsResult<G, M>>(key);
        if (cached) {
            return cached;
        }

        const { rollup } = this.definition;
        const [rows, ownRows, total, extra] = await Promise.all([
            rollup && translated ?
                rollup.repository.aggregate(translated).then((output) => output.map((row) => rollup.translateRow(row))) :
                this.definition.repository.aggregate(bound(scoped)),
            own ? this.definition.repository.aggregate(bound(own)) : [],
            this.countTotal(prefix, stripWindowConditions(scoped, dateColumn)),
            this.definition.meta ? this.definition.meta() : {},
        ]);

        const merged = new Map<string, Record<string, unknown>>();
        for (const row of [...rows, ...ownRows]) {
            const normalized = {
                ...row,
                [dateColumn]: new Date(row[dateColumn] as string).toISOString(),
            };
            const { count, ...group } = normalized;
            const id = JSON.stringify(Object.entries(group).sort(([a], [b]) => a.localeCompare(b)));

            const existing = merged.get(id);
            if (existing) {
                existing.count = Number(existing.count) + Number(count);
            } else {
                merged.set(id, normalized);
            }
        }

        const result = {
            data: merged.values().toArray(),
            meta: {
                from: window.from,
                to: window.to,
                bucket: window.unit,
                total,
                ...extra,
            },
        } as EntityStatsResult<G, M>;

        await this.cache.set(key, result, { ttl: STATS_CACHE_TTL });

        return result;
    }

    protected isRoutable(query: IQuery): boolean {
        const { rollup } = this.definition;

        return !!rollup &&
            readReferencedColumns(query).every((column) => rollup.columns.includes(column));
    }

    /**
     * The query onto the rollups, undefined when they cannot answer it:
     * an hour read, an unstored column, a bound inside a day or a window
     * past the rollup horizon.
     */
    protected translate(query: IQuery, window: StatsWindow, now: Date): IQuery | undefined {
        const { rollup } = this.definition;
        if (!rollup || window.unit === 'hour' || !this.isRoutable(query)) {
            return undefined;
        }

        // a rollup answers whole days, so an open window ends at the next
        // day boundary rather than the read instant
        const end = new Date(now);
        end.setUTCHours(24, 0, 0, 0);

        const translated = rollup.translate(window.upperBound ?
            query :
            appendQueryConditions(query, lt(this.definition.dateColumn ?? 'createdAt', end.toISOString())));

        if (!translated || isPastRawHorizon(window, rollup.horizonDays?.(), now)) {
            return undefined;
        }

        return translated;
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
