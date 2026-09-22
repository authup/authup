/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Event, User } from '@authup/core-kit';
import {
    EventName,
    EventScope,
    IdentityType,
    PermissionName,
} from '@authup/core-kit';
import type { EntityQueryInput } from '@authup/core-http-kit';
import { StatsGranularity, buildQueryString } from '@authup/core-http-kit';
import { isValidationError } from '@authup/errors';
import type { ActorContext } from '@authup/server-kit';
import { MemoryCache } from '@authup/server-kit';
import { eq } from '@rapiq/core';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import { EventService, eventSchema } from '../../../../src/core/entities/event/index.ts';
import type { EntityStatsDefinition } from '../../../../src/core/index.ts';
import { EntityStatsService, STATS_MAX_BUCKETS } from '../../../../src/core/index.ts';
import { FakeEventRepository } from '../entities/event/fake-repository.ts';
import { FakeEntityStatsRepository } from './fake-repository.ts';

const HOUR_IN_MS = 3_600_000;
const DAY_IN_MS = 86_400_000;

const realmId = randomUUID();
const otherRealmId = randomUUID();
const userId = randomUUID();
const otherUserId = randomUUID();

function makeActor(options: {
    allow: boolean, 
    identity?: boolean, 
    id?: string 
} = { allow: true }): ActorContext {
    const evaluator = new FakePermissionEvaluator();
    if (!options.allow) {
        evaluator.denyAll();
    }

    const actor: ActorContext = { permissionEvaluator: evaluator };
    if (options.identity !== false) {
        actor.identity = {
            type: IdentityType.USER,
            data: {
                id: options.id ?? userId,
                realmId,
            } as User,
        };
    }

    return actor;
}

function evaluatorOf(actor: ActorContext): FakePermissionEvaluator {
    return actor.permissionEvaluator as FakePermissionEvaluator;
}

/**
 * The record the HTTP layer hands the service for a client-built query: the
 * kit's own wire form, parsed back like `useRequestQuery` does.
 */
function wire(input: EntityQueryInput<Event>, extra: Record<string, unknown> = {}): Record<string, any> {
    return {
        ...Object.fromEntries(new URLSearchParams(buildQueryString(input).replace(/^\?/, ''))),
        ...extra,
    };
}

function startOfUTCDay(input: Date): string {
    const date = new Date(input);
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString();
}

function startOfUTCHour(input: Date): string {
    const date = new Date(input);
    date.setUTCMinutes(0, 0, 0);
    return date.toISOString();
}

function defineEventStats(
    repository: FakeEntityStatsRepository<Event>,
    enabled = true,
): EntityStatsDefinition {
    const events = new EventService({ repository: new FakeEventRepository() });

    return {
        type: 'event',
        schema: eventSchema,
        repository,
        groupBy: ['scope', 'name'],
        scope: (query, actor) => events.scopeRead(query, actor),
        meta: () => ({ enabled }),
    };
}

describe('EntityStatsService', () => {
    let repository: FakeEntityStatsRepository<Event>;
    let cache: MemoryCache;
    let service: EntityStatsService;

    // the clock is frozen so the service and the expectations read one
    // instant: an asynchronous step crossing an hour or day boundary would
    // otherwise put them in different buckets
    const NOW = '2026-09-22T10:30:00.000Z';

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(NOW));

        repository = new FakeEntityStatsRepository<Event>();
        cache = new MemoryCache();
        service = new EntityStatsService({ definition: defineEventStats(repository), cache });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // a row is always created before the read that counts it; with the clock
    // frozen the default seed lands a minute before the window's open end
    const factory = new FakeEventRepository();
    function seed(data: Record<string, unknown> = {}) {
        return repository.seed(factory.create({
            scope: EventScope.OAUTH2,
            name: EventName.LOGIN,
            actorType: IdentityType.USER,
            actorId: otherUserId,
            realmId,
            createdAt: new Date(Date.now() - 60_000).toISOString(),
            ...data,
        } as Partial<Event>));
    }

    it('counts rows per day bucket and (scope, name) for an actor whose reach compiles to allow', async () => {
        seed();
        seed();
        seed({ name: EventName.LOGIN_FAILED });

        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        const { data, meta } = await service.getMany({}, actor);

        const bucket = startOfUTCDay(new Date());
        expect(data).toEqual(expect.arrayContaining([
            {
                bucket,
                scope: EventScope.OAUTH2,
                name: EventName.LOGIN,
                count: 2,
            },
            {
                bucket,
                scope: EventScope.OAUTH2,
                name: EventName.LOGIN_FAILED,
                count: 1,
            },
        ]));
        expect(data).toHaveLength(2);
        expect(meta.granularity).toEqual(StatsGranularity.DAY);
        expect(meta.days).toEqual(30);
        expect(meta.enabled).toBe(true);
    });

    it('buckets by hour when asked to', async () => {
        seed();
        seed({ createdAt: new Date(Date.now() - (2 * HOUR_IN_MS)).toISOString() });

        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        const { data, meta } = await service.getMany({ granularity: 'hour', days: 1 }, actor);

        expect(meta.granularity).toEqual(StatsGranularity.HOUR);
        expect(data.map((row) => row.bucket)).toEqual(expect.arrayContaining([
            startOfUTCHour(new Date()),
            startOfUTCHour(new Date(Date.now() - (2 * HOUR_IN_MS))),
        ]));
        expect(data.every((row) => row.count === 1)).toBe(true);
    });

    it('spans exactly days times buckets per day, the last bucket holding now', async () => {
        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        const daily = await service.getMany({ days: 7 }, actor);
        expect(daily.meta.from).toEqual('2026-09-16T00:00:00.000Z');
        expect(daily.meta.to).toEqual(NOW);

        // the window rides the query as two createdAt conditions
        const encoded = decodeURIComponent(buildQueryString(repository.countGroupedCalls[0].query));
        expect(encoded).toContain(`gte(createdAt,'${daily.meta.from}')`);
        expect(encoded).toContain(`lt(createdAt,'${NOW}')`);

        const hourly = await service.getMany({ days: 1, granularity: 'hour' }, actor);
        expect(hourly.meta.from).toEqual('2026-09-21T11:00:00.000Z');
        expect(hourly.meta.to).toEqual(NOW);
    });

    it('leaves rows outside the half-open window out', async () => {
        seed();
        seed({ createdAt: new Date(Date.now() - (40 * DAY_IN_MS)).toISOString() });
        seed({ createdAt: new Date(Date.now() + HOUR_IN_MS).toISOString() });

        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        const { data } = await service.getMany({ days: 30 }, actor);

        expect(data).toHaveLength(1);
        expect(data[0].count).toEqual(1);
    });

    it('decodes the client filter through the event schema', async () => {
        seed();
        seed({ realmId: null });
        seed({ realmId: otherRealmId });
        seed({ name: EventName.LOGIN_FAILED });

        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        const { data } = await service.getMany(wire({ filters: { realmId: [realmId, null], name: EventName.LOGIN } }), actor);

        expect(data).toHaveLength(1);
        expect(data[0].name).toEqual(EventName.LOGIN);
        expect(data[0].count).toEqual(2);
    });

    it('refuses a filter key the event schema does not allow', async () => {
        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        await expect(service.getMany(wire({ filters: { requestUserAgent: 'curl' } }), actor))
            .rejects.toBeDefined();
        expect(repository.countGroupedCalls).toHaveLength(0);
    });

    it('scopes an actor without event_read to its own rows', async () => {
        seed({ actorId: userId });
        seed();

        const actor = makeActor({ allow: false });
        const { data } = await service.getMany({}, actor);

        expect(data).toHaveLength(1);
        expect(data[0].count).toEqual(1);
    });

    it('rejects an anonymous actor without the read permission', async () => {
        const actor = makeActor({ allow: false, identity: false });

        await expect(service.getMany({}, actor)).rejects.toBeDefined();
        expect(repository.countGroupedCalls).toHaveLength(0);
    });

    it('lowers a conditional reach onto the grouped query, own rows always included', async () => {
        seed();
        seed({ realmId: otherRealmId });
        seed({ realmId: otherRealmId, actorId: userId });

        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({
            verdict: 'conditional',
            condition: eq('realmId', realmId),
        });

        const { data } = await service.getMany({}, actor);

        expect(data).toHaveLength(1);
        expect(data[0].count).toEqual(2);
    });

    it('intersects the client filter with the compiled reach', async () => {
        seed({ realmId: otherRealmId });
        seed();

        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({
            verdict: 'conditional',
            condition: eq('realmId', realmId),
        });

        const { data } = await service.getMany(wire({ filters: { realmId: otherRealmId } }), actor);

        expect(data).toHaveLength(0);
    });

    it('falls back to own rows when the reach compiles to post', async () => {
        seed({ actorId: userId });
        seed();

        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'post' });

        const { data } = await service.getMany({}, actor);

        expect(data).toHaveLength(1);
        expect(data[0].count).toEqual(1);
        expect(evaluatorOf(actor).evaluateCalls).toHaveLength(0);
    });

    it('falls back to own rows when the reach compiles to deny', async () => {
        seed({ actorId: userId });
        seed();

        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'deny' });

        const { data } = await service.getMany({}, actor);

        expect(data).toHaveLength(1);
    });

    it('counts nothing for an identity-less actor whose reach compiles to deny', async () => {
        seed();

        const actor = makeActor({ allow: true, identity: false });
        evaluatorOf(actor).setCompileResult({ verdict: 'deny' });

        const { data } = await service.getMany({}, actor);

        expect(data).toHaveLength(0);
    });

    it('applies the route realm as a mandatory constraint', async () => {
        seed();
        seed({ realmId: null });
        seed({ realmId: otherRealmId });

        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        const { data } = await service.getMany({}, actor, { realmId });

        expect(data).toHaveLength(1);
        expect(data[0].count).toEqual(1);
    });

    it('refuses a window past the bucket ceiling', async () => {
        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        const hourly = (STATS_MAX_BUCKETS / 24) + 1;
        await expect(service.getMany({ granularity: 'hour', days: hourly }, actor))
            .rejects.toSatisfy(isValidationError);
        await expect(service.getMany({ days: STATS_MAX_BUCKETS + 1 }, actor))
            .rejects.toSatisfy(isValidationError);

        expect(repository.countGroupedCalls).toHaveLength(0);
    });

    it('refuses a malformed window', async () => {
        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        await expect(service.getMany({ days: 0 }, actor)).rejects.toBeDefined();
        await expect(service.getMany({ days: 'soon' }, actor)).rejects.toBeDefined();
        await expect(service.getMany({ granularity: 'week' }, actor)).rejects.toBeDefined();
        expect(repository.countGroupedCalls).toHaveLength(0);
    });

    it('serves a second read within the ttl from the cache', async () => {
        seed();

        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        const first = await service.getMany({ days: 7 }, actor);
        seed();
        const second = await service.getMany({ days: 7 }, actor);

        expect(second).toEqual(first);
        expect(repository.countGroupedCalls).toHaveLength(1);
    });

    it('keys the cache by actor, route realm and query', async () => {
        seed();

        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });
        const other = makeActor({ allow: true, id: otherUserId });
        evaluatorOf(other).setCompileResult({ verdict: 'allow' });

        await service.getMany({ days: 7 }, actor);
        await service.getMany({ days: 7 }, other);
        await service.getMany({ days: 14 }, actor);
        await service.getMany({ days: 7, granularity: 'hour' }, actor);
        await service.getMany({ days: 7 }, actor, { realmId });
        await service.getMany(wire({ filters: { name: EventName.LOGIN } }, { days: 7 }), actor);

        expect(repository.countGroupedCalls).toHaveLength(6);
    });

    it('shares the cache between two spellings of one query', async () => {
        seed();

        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        await service.getMany({ days: 7, granularity: 'day' }, actor);
        await service.getMany({ granularity: 'day', days: '7' }, actor);
        expect(repository.countGroupedCalls).toHaveLength(1);

        await service.getMany(wire({ filters: { name: EventName.LOGIN } }), actor);
        await service.getMany({ filter: { name: EventName.LOGIN } }, actor);
        expect(repository.countGroupedCalls).toHaveLength(2);
    });

    it('partitions the cache by the request\'s reach, not by the identity alone', async () => {
        seed({ actorId: userId });
        seed();

        const broad = makeActor();
        evaluatorOf(broad).setCompileResult({ verdict: 'allow' });
        const { data: broadData } = await service.getMany({}, broad);
        expect(broadData[0].count).toEqual(2);

        // the same identity, on a request whose token withholds the permission
        const restricted = makeActor({ allow: false });
        const { data: restrictedData } = await service.getMany({}, restricted);
        expect(restrictedData[0].count).toEqual(1);

        // the same identity, on a request whose grants lower to a condition
        const narrowed = makeActor();
        evaluatorOf(narrowed).setCompileResult({
            verdict: 'conditional',
            condition: eq('realmId', otherRealmId),
        });
        const { data: narrowedData } = await service.getMany({}, narrowed);
        expect(narrowedData[0].count).toEqual(1);

        expect(repository.countGroupedCalls).toHaveLength(3);
    });

    it('runs the gate before the cache lookup', async () => {
        seed();

        const permitted = makeActor({ allow: true, identity: false });
        evaluatorOf(permitted).setCompileResult({ verdict: 'allow' });
        await service.getMany({}, permitted);
        expect(repository.countGroupedCalls).toHaveLength(1);

        const refused = makeActor({ allow: false, identity: false });
        await expect(service.getMany({}, refused)).rejects.toBeDefined();
        expect(repository.countGroupedCalls).toHaveLength(1);
    });

    it('reports a disabled event log', async () => {
        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        const { meta } = await new EntityStatsService({
            definition: defineEventStats(repository, false),
            cache,
        }).getMany({}, actor);

        expect(meta.enabled).toBe(false);
    });

    it('asks the evaluator for the event read permission only', async () => {
        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        await service.getMany({}, actor);

        expect(evaluatorOf(actor).preEvaluateOneOfCalls.map((call) => call.name)).toEqual([[PermissionName.EVENT_READ]]);
        expect(evaluatorOf(actor).compileCalls.map((call) => call.name)).toEqual([[PermissionName.EVENT_READ]]);
    });

    it('reports the total the filter and the reach admit, regardless of the window', async () => {
        seed();
        seed({ createdAt: new Date(Date.now() - (40 * DAY_IN_MS)).toISOString() });
        seed({ realmId: otherRealmId });

        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({
            verdict: 'conditional',
            condition: eq('realmId', realmId),
        });

        const { data, meta } = await service.getMany({ days: 7 }, actor);

        expect(data).toHaveLength(1);
        expect(data[0].count).toEqual(1);
        expect(meta.total).toEqual(2);
    });

    it('narrows a post reach to nothing for an entity without an ownership term', async () => {
        const roles = new FakeEntityStatsRepository<Record<string, any>>();
        roles.seed({
            id: randomUUID(), 
            realmId, 
            createdAt: new Date(Date.now() - 60_000).toISOString(), 
        });

        const roleStats = new EntityStatsService({
            definition: {
                type: 'role',
                schema: eventSchema,
                repository: roles,
                scope: async (query) => ({
                    query, 
                    post: true, 
                    ownership: null, 
                }),
            },
            cache,
        });

        const { data, meta } = await roleStats.getMany({}, makeActor());

        expect(data).toHaveLength(0);
        expect(meta.total).toEqual(0);
    });

    it('counts every row for an ungated definition', async () => {
        const realms = new FakeEntityStatsRepository<Record<string, any>>();
        realms.seed({ id: randomUUID(), createdAt: new Date(Date.now() - 60_000).toISOString() });
        realms.seed({ id: randomUUID(), createdAt: new Date(Date.now() - 60_000).toISOString() });

        const realmStats = new EntityStatsService({
            definition: {
                type: 'realm',
                schema: eventSchema,
                repository: realms,
                realmColumn: null,
            },
            cache,
        });

        const { data, meta } = await realmStats.getMany({}, makeActor({ allow: true, identity: false }), { realmId });

        expect(data).toEqual([{ bucket: startOfUTCDay(new Date()), count: 2 }]);
        expect(meta.total).toEqual(2);
    });

    it('keys the cache by the statistic', async () => {
        seed();

        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        const other = new FakeEntityStatsRepository<Event>();
        const otherStats = new EntityStatsService({
            definition: { ...defineEventStats(other), type: 'other' },
            cache,
        });

        await service.getMany({}, actor);
        const { data } = await otherStats.getMany({}, actor);

        expect(data).toHaveLength(0);
        expect(other.countGroupedCalls).toHaveLength(1);
    });
});
