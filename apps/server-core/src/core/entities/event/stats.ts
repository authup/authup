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
    inArray,
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

        // the gate runs before the cache lookup on purpose: identity-less
        // actors share one key, so a lookup first would hand one actor's
        // counts to another the gate refuses. Only the lowering waits.
        const canReadAll = await this.assertReadable(actor);

        // the key is the decoded query, not the wire record: two spellings of
        // one filter, or the parameters in another order, share an answer
        const key = [
            'eventStats',
            actor.identity ? `${actor.identity.type}:${actor.identity.data.id}` : 'anonymous',
            options.realmId ?? '',
            granularity,
            days,
            queryCodec.encode(parsed) ?? '',
        ].join(':');

        const cached = await this.cache.get<EventStatsResult>(key);
        if (cached) {
            return cached;
        }

        const { scoped, owner } = canReadAll ?
            await this.lowerReach(parsed, actor) :
            { scoped: parsed, owner: ownerOf(actor) };

        const now = new Date();
        const from = snapToBucket(new Date(now.getTime() - (days * DAY_IN_MS)), granularity);

        const data = await this.repository.countGrouped(scoped, {
            from,
            granularity,
            ...(options.realmId ? { realmId: options.realmId } : {}),
            ...(owner ? { owner } : {}),
        });

        const result: EventStatsResult = {
            data,
            meta: {
                from,
                to: now.toISOString(),
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
