/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventStatsGranularity, PermissionName } from '@authup/core-kit';
import { ValidationError } from '@authup/errors';
import type { ActorContext, ICache } from '@authup/server-kit';
import {
    and,
    eq,
    gte,
    inArray,
    lt,
    or,
} from '@rapiq/core';
import type { IQuery } from '@rapiq/core';
import { appendQueryConditions, decodeQuery, queryCodec } from '../../query/module.ts';
import {
    EVENT_STATS_CACHE_TTL,
    EVENT_STATS_DAYS_DEFAULT,
    EVENT_STATS_MAX_BUCKETS,
} from './constants.ts';
import { eventSchema } from './schema.ts';
import { EventStatsParametersValidator } from './stats-validator.ts';
import type {
    EventOwner,
    EventServiceOptions,
    EventServiceReadOptions,
    EventStatsResult,
    IEventRepository,
    IEventStatsService,
} from './types.ts';

const HOUR_IN_MS = 3_600_000;
const DAY_IN_MS = 86_400_000;

export type EventStatsServiceContext = {
    repository: IEventRepository,
    cache: ICache,
    options?: EventServiceOptions,
};

export class EventStatsService implements IEventStatsService {
    protected repository: IEventRepository;

    protected cache: ICache;

    protected options: EventServiceOptions;

    protected validator: EventStatsParametersValidator;

    constructor(ctx: EventStatsServiceContext) {
        this.repository = ctx.repository;
        this.cache = ctx.cache;
        this.options = ctx.options ?? {};
        this.validator = new EventStatsParametersValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
        options: EventServiceReadOptions = {},
    ): Promise<EventStatsResult> {
        const parameters = await this.validator.run(query);
        const granularity = parameters.granularity ?? EventStatsGranularity.DAY;
        const days = parameters.days ?? EVENT_STATS_DAYS_DEFAULT;
        const bucketsPerDay = granularity === EventStatsGranularity.HOUR ? 24 : 1;
        if (days * bucketsPerDay > EVENT_STATS_MAX_BUCKETS) {
            throw new ValidationError(`The window spans more than ${EVENT_STATS_MAX_BUCKETS} buckets.`);
        }

        const parsed = await decodeQuery(query, {
            schema: eventSchema,
            parameters: ['filters'],
            actor,
        });

        // the whole gate runs before the cache lookup, and the key carries
        // what it produced: reach is a property of the REQUEST (a token
        // narrowed to its client, a bearer without `global`), not of the
        // identity, so two requests by one identity can lower to different
        // queries and one must never read the other's answer
        const { scoped, owner } = await this.assertReadable(actor) ?
            await this.lowerReach(parsed, actor) :
            { scoped: parsed, owner: ownerOf(actor) };

        // the encoded query is the lowered one, not the wire record: two
        // spellings of one filter share an answer, two reaches do not
        const key = [
            'eventStats',
            actor.identity ? `${actor.identity.type}:${actor.identity.data.id}` : 'anonymous',
            options.realmId ?? '',
            granularity,
            days,
            queryCodec.encode(scoped) ?? '',
            owner ? `${owner.actorType}:${owner.actorId}` : '',
        ].join(':');

        const cached = await this.cache.get<EventStatsResult>(key);
        if (cached) {
            return cached;
        }

        // one half-open window of exactly days * bucketsPerDay bucket
        // starts, the last of them the bucket holding `to`. It rides the IR
        // like any other condition since rapiq 2.3.0 binds a date operand in
        // the column's storage form (tada5hi/rapiq#939), and it is appended
        // AFTER the key was taken, since `to` moves with every request.
        const now = new Date();
        const to = now.toISOString();
        const width = granularity === EventStatsGranularity.HOUR ? HOUR_IN_MS : DAY_IN_MS;
        const from = new Date(
            new Date(snapToBucket(now, granularity)).getTime() - (((days * bucketsPerDay) - 1) * width),
        ).toISOString();

        const data = await this.repository.countGrouped(
            appendQueryConditions(scoped, gte('createdAt', from), lt('createdAt', to)),
            {
                granularity,
                ...(options.realmId ? { realmId: options.realmId } : {}),
                ...(owner ? { owner } : {}),
            },
        );

        const result: EventStatsResult = {
            data,
            meta: {
                from,
                to,
                granularity,
                days,
                enabled: this.options.enabled !== false,
            },
        };

        await this.cache.set(key, result, { ttl: EVENT_STATS_CACHE_TTL });

        return result;
    }

    /**
     * The list's pre-gate: an actor without EVENT_READ may still count its
     * own rows, an actor without an identity may not count at all.
     */
    protected async assertReadable(actor: ActorContext): Promise<boolean> {
        try {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.EVENT_READ });
            return true;
        } catch (e) {
            if (!actor.identity) {
                throw e;
            }

            return false;
        }
    }

    /**
     * The list's compiled reach, minus its per-row loop: a grouped count has
     * no row to evaluate, so a reach that does not lower (`post`) counts the
     * actor's own rows and nothing else, the direction that cannot
     * over-disclose.
     */
    protected async lowerReach(parsed: IQuery, actor: ActorContext): Promise<{ scoped: IQuery, owner?: EventOwner }> {
        const owner = ownerOf(actor);

        const compiled = await actor.permissionEvaluator.compile({ name: PermissionName.EVENT_READ });
        if (compiled.verdict === 'allow') {
            return { scoped: parsed };
        }

        if (compiled.verdict === 'conditional') {
            const ownership = owner ?
                and(eq('actorId', owner.actorId), eq('actorType', owner.actorType)) :
                null;

            return {
                scoped: appendQueryConditions(
                    parsed,
                    ownership ? or(ownership, compiled.condition) : compiled.condition,
                ),
            };
        }

        if (owner) {
            return { scoped: parsed, owner };
        }

        return { scoped: appendQueryConditions(parsed, inArray('id', [])) };
    }
}

function ownerOf(actor: ActorContext): EventOwner | undefined {
    return actor.identity ?
        { actorId: actor.identity.data.id, actorType: actor.identity.type } :
        undefined;
}

function snapToBucket(input: Date, granularity: `${EventStatsGranularity}`): string {
    const date = new Date(input);
    if (granularity === EventStatsGranularity.HOUR) {
        date.setUTCMinutes(0, 0, 0);
    } else {
        date.setUTCHours(0, 0, 0, 0);
    }

    return date.toISOString();
}
