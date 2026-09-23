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
import { buildQueryString } from '@authup/core-http-kit';
import { isValidationError } from '@authup/errors';
import type { ActorContext } from '@authup/server-kit';
import { MemoryCache } from '@authup/server-kit';
import type { ICondition } from '@rapiq/core';
import {
    and,
    eq,
    gte,
    inArray,
    lt,
    or,
} from '@rapiq/core';
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
import { EntityStatsService } from '../../../../src/core/index.ts';
import { FakeEventRepository } from '../entities/event/fake-repository.ts';
import { FakeEntityStatsRepository } from './fake-repository.ts';

const HOUR_IN_MS = 3_600_000;
const DAY_IN_MS = 86_400_000;

// the clock is frozen so the service and the expectations read one instant
const NOW = '2026-09-23T10:30:00.000Z';
const TODAY = '2026-09-23T00:00:00.000Z';
const WEEK_AGO = '2026-09-16T00:00:00.000Z';

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

type StatsInput = {
    from?: string,
    unit?: 'hour' | 'day' | 'month',
    groups?: (keyof Event & string)[],
    filter?: ICondition,
};

/**
 * The record the HTTP layer hands the service for a client-built query: the
 * kit's own wire form, parsed back like `useRequestQuery` does.
 */
function wire(input: StatsInput = {}): Record<string, any> {
    const lower = gte('createdAt', input.from ?? WEEK_AGO);

    const encoded = buildQueryString<Event>({
        filters: input.filter ? and(lower, input.filter) : lower,
        groups: [
            { name: 'bucket', params: ['createdAt', input.unit ?? 'day'] },
            ...(input.groups ?? ['scope', 'name']),
        ],
        aggregates: ['count'],
    });

    return Object.fromEntries(new URLSearchParams(encoded.replace(/^\?/, '')));
}

function defineEventStats(
    repository: FakeEntityStatsRepository<Event>,
    options: { enabled?: boolean, rawHorizonDays?: number } = {},
): EntityStatsDefinition {
    const events = new EventService({ repository: new FakeEventRepository() });

    return {
        type: 'event',
        schema: eventSchema,
        repository,
        scope: (query, actor) => events.scopeRead(query, actor),
        rawHorizonDays: () => options.rawHorizonDays ?? 0,
        meta: () => ({ enabled: options.enabled ?? true }),
    };
}

describe('EntityStatsService', () => {
    let repository: FakeEntityStatsRepository<Event>;
    let cache: MemoryCache;
    let service: EntityStatsService;

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

    function allowed() {
        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });
        return actor;
    }

    it('counts rows per day bucket and (scope, name), keyed by column', async () => {
        seed();
        seed();
        seed({ name: EventName.LOGIN_FAILED });

        const { data, meta } = await service.getMany(wire(), allowed());

        expect(data).toEqual(expect.arrayContaining([
            {
                createdAt: TODAY,
                scope: EventScope.OAUTH2,
                name: EventName.LOGIN,
                count: 2,
            },
            {
                createdAt: TODAY,
                scope: EventScope.OAUTH2,
                name: EventName.LOGIN_FAILED,
                count: 1,
            },
        ]));
        expect(data).toHaveLength(2);
        expect(meta).toMatchObject({
            from: WEEK_AGO,
            to: NOW,
            bucket: 'day',
            enabled: true,
        });
    });

    it('buckets by hour when asked to', async () => {
        seed();
        seed({ createdAt: new Date(Date.now() - (2 * HOUR_IN_MS)).toISOString() });

        const { data, meta } = await service.getMany(wire({
            from: new Date(Date.now() - DAY_IN_MS).toISOString(),
            unit: 'hour',
            groups: [],
        }), allowed());

        expect(meta.bucket).toEqual('hour');
        expect(meta.from).toEqual('2026-09-22T10:00:00.000Z');
        expect(data).toEqual(expect.arrayContaining([
            { createdAt: '2026-09-23T10:00:00.000Z', count: 1 },
            { createdAt: '2026-09-23T08:00:00.000Z', count: 1 },
        ]));
    });

    it('ends an open window at the read instant', async () => {
        await service.getMany(wire(), allowed());

        const encoded = decodeURIComponent(buildQueryString(repository.aggregateCalls[0]));
        expect(encoded).toContain(`gte(createdAt,'${WEEK_AGO}')`);
        expect(encoded).toContain(`lt(createdAt,'${NOW}')`);
    });

    it('leaves rows outside the window out', async () => {
        seed();
        seed({ createdAt: new Date(Date.now() - (40 * DAY_IN_MS)).toISOString() });
        seed({ createdAt: new Date(Date.now() + HOUR_IN_MS).toISOString() });

        const { data } = await service.getMany(wire(), allowed());

        expect(data).toHaveLength(1);
        expect(data[0].count).toEqual(1);
    });

    it('keeps an explicit upper bound and reports it as the window end', async () => {
        seed({ createdAt: '2026-09-17T12:00:00.000Z' });
        seed({ createdAt: '2026-09-19T12:00:00.000Z' });

        const { data, meta } = await service.getMany(wire({ filter: lt('createdAt', '2026-09-18T00:00:00.000Z') }), allowed());

        expect(meta.to).toEqual('2026-09-18T00:00:00.000Z');
        expect(data).toEqual([expect.objectContaining({ createdAt: '2026-09-17T00:00:00.000Z', count: 1 })]);
    });

    it('decodes the client filter through the event schema', async () => {
        seed();
        seed({ realmId: null });
        seed({ realmId: otherRealmId });
        seed({ name: EventName.LOGIN_FAILED });

        const { data } = await service.getMany(wire({ filter: and(inArray('realmId', [realmId, null]), eq('name', EventName.LOGIN)) }), allowed());

        expect(data).toHaveLength(1);
        expect(data[0].name).toEqual(EventName.LOGIN);
        expect(data[0].count).toEqual(2);
    });

    it('refuses a filter key or a group the event schema does not allow', async () => {
        await expect(service.getMany(wire({ filter: eq('requestUserAgent', 'curl') }), allowed()))
            .rejects.toBeDefined();
        await expect(service.getMany(wire({ groups: ['actorName'] }), allowed()))
            .rejects.toBeDefined();

        expect(repository.aggregateCalls).toHaveLength(0);
    });

    it('refuses a read without a bucket or without a lower bound', async () => {
        const { group, ...ungrouped } = wire();
        expect(group).toBeDefined();
        await expect(service.getMany(ungrouped, allowed())).rejects.toSatisfy(isValidationError);

        const { filter, ...unbounded } = wire();
        expect(filter).toBeDefined();
        await expect(service.getMany(unbounded, allowed())).rejects.toSatisfy(isValidationError);

        await expect(service.getMany({ granularity: 'day', days: '30' }, allowed()))
            .rejects.toSatisfy(isValidationError);

        expect(repository.aggregateCalls).toHaveLength(0);
    });

    it('refuses a window past the bucket ceiling', async () => {
        await expect(service.getMany(wire({ from: '2024-01-01T00:00:00.000Z' }), allowed()))
            .rejects.toSatisfy(isValidationError);

        expect(repository.aggregateCalls).toHaveLength(0);
    });

    it('refuses hour buckets past the raw horizon', async () => {
        const horizon = new EntityStatsService({
            definition: defineEventStats(repository, { rawHorizonDays: 7 }),
            cache,
        });

        const from = new Date(Date.now() - (8 * DAY_IN_MS)).toISOString();
        await expect(horizon.getMany(wire({ from, unit: 'hour' }), allowed()))
            .rejects.toSatisfy(isValidationError);

        const { meta } = await horizon.getMany(wire({ from, unit: 'day' }), allowed());
        expect(meta.bucket).toEqual('day');
    });

    it('returns every group row, never a page of them', async () => {
        for (let day = 0; day < 90; day++) {
            for (let name = 0; name < 20; name++) {
                seed({
                    name: `event-${name}`,
                    createdAt: new Date(Date.parse(TODAY) - (day * DAY_IN_MS) + HOUR_IN_MS).toISOString(),
                });
            }
        }

        const { data } = await service.getMany(wire({
            from: new Date(Date.parse(TODAY) - (89 * DAY_IN_MS)).toISOString(),
            groups: ['name'],
        }), allowed());

        expect(data).toHaveLength(1800);
    });

    it('scopes an actor without event_read to its own rows', async () => {
        seed({ actorId: userId });
        seed();

        const { data } = await service.getMany(wire(), makeActor({ allow: false }));

        expect(data).toHaveLength(1);
        expect(data[0].count).toEqual(1);
    });

    it('rejects an anonymous actor without the read permission', async () => {
        await expect(service.getMany(wire(), makeActor({ allow: false, identity: false }))).rejects.toBeDefined();
        expect(repository.aggregateCalls).toHaveLength(0);
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

        const { data } = await service.getMany(wire(), actor);

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

        const { data } = await service.getMany(wire({ filter: eq('realmId', otherRealmId) }), actor);

        expect(data).toHaveLength(0);
    });

    it('falls back to own rows when the reach compiles to post', async () => {
        seed({ actorId: userId });
        seed();

        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'post' });

        const { data } = await service.getMany(wire(), actor);

        expect(data).toHaveLength(1);
        expect(data[0].count).toEqual(1);
        expect(evaluatorOf(actor).evaluateCalls).toHaveLength(0);
    });

    it('falls back to own rows when the reach compiles to deny', async () => {
        seed({ actorId: userId });
        seed();

        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'deny' });

        const { data } = await service.getMany(wire(), actor);

        expect(data).toHaveLength(1);
    });

    it('counts nothing for an identity-less actor whose reach compiles to deny', async () => {
        seed();

        const actor = makeActor({ allow: true, identity: false });
        evaluatorOf(actor).setCompileResult({ verdict: 'deny' });

        const { data } = await service.getMany(wire(), actor);

        expect(data).toHaveLength(0);
    });

    it('applies the route realm as a mandatory constraint', async () => {
        seed();
        seed({ realmId: null });
        seed({ realmId: otherRealmId });

        const { data } = await service.getMany(wire(), allowed(), { realmId });

        expect(data).toHaveLength(1);
        expect(data[0].count).toEqual(1);
    });

    it('serves a second read within the ttl from the cache', async () => {
        seed();

        const actor = allowed();
        const first = await service.getMany(wire(), actor);
        seed();
        const second = await service.getMany(wire(), actor);

        expect(second).toEqual(first);
        expect(repository.aggregateCalls).toHaveLength(1);
    });

    it('keys the cache by actor, route realm and query', async () => {
        seed();

        const actor = allowed();
        const other = makeActor({ allow: true, id: otherUserId });
        evaluatorOf(other).setCompileResult({ verdict: 'allow' });

        await service.getMany(wire(), actor);
        await service.getMany(wire(), other);
        await service.getMany(wire({ from: '2026-09-09T00:00:00.000Z' }), actor);
        await service.getMany(wire({ unit: 'hour' }), actor);
        await service.getMany(wire({ groups: ['scope'] }), actor);
        await service.getMany(wire(), actor, { realmId });
        await service.getMany(wire({ filter: eq('name', EventName.LOGIN) }), actor);

        expect(repository.aggregateCalls).toHaveLength(7);
    });

    it('shares the cache between two spellings of one query', async () => {
        seed();

        const actor = allowed();
        await service.getMany(wire(), actor);
        await service.getMany({
            filter: { createdAt: `>=${WEEK_AGO}` },
            group: 'bucket(createdAt,day),scope,name',
            aggregate: 'count',
        }, actor);

        expect(repository.aggregateCalls).toHaveLength(1);
    });

    it('partitions the cache by the request\'s reach, not by the identity alone', async () => {
        seed({ actorId: userId });
        seed();

        const { data: broadData } = await service.getMany(wire(), allowed());
        expect(broadData[0].count).toEqual(2);

        // the same identity, on a request whose token withholds the permission
        const { data: restrictedData } = await service.getMany(wire(), makeActor({ allow: false }));
        expect(restrictedData[0].count).toEqual(1);

        // the same identity, on a request whose grants lower to a condition
        const narrowed = makeActor();
        evaluatorOf(narrowed).setCompileResult({
            verdict: 'conditional',
            condition: eq('realmId', otherRealmId),
        });
        const { data: narrowedData } = await service.getMany(wire(), narrowed);
        expect(narrowedData[0].count).toEqual(1);

        expect(repository.aggregateCalls).toHaveLength(3);
    });

    it('runs the gate before the cache lookup', async () => {
        seed();

        const permitted = makeActor({ allow: true, identity: false });
        evaluatorOf(permitted).setCompileResult({ verdict: 'allow' });
        await service.getMany(wire(), permitted);
        expect(repository.aggregateCalls).toHaveLength(1);

        await expect(service.getMany(wire(), makeActor({ allow: false, identity: false }))).rejects.toBeDefined();
        expect(repository.aggregateCalls).toHaveLength(1);
    });

    it('reports a disabled event log', async () => {
        const { meta } = await new EntityStatsService({
            definition: defineEventStats(repository, { enabled: false }),
            cache,
        }).getMany(wire(), allowed());

        expect(meta.enabled).toBe(false);
    });

    it('asks the evaluator for the event read permission only', async () => {
        const actor = allowed();

        await service.getMany(wire(), actor);

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

        const { data, meta } = await service.getMany(wire(), actor);

        expect(data).toHaveLength(1);
        expect(data[0].count).toEqual(1);
        expect(meta.total).toEqual(2);
    });

    it('keeps a range nested in an or narrowing the total', async () => {
        seed();
        seed({ createdAt: new Date(Date.now() - (40 * DAY_IN_MS)).toISOString() });

        const { meta } = await service.getMany(wire({ filter: or(gte('createdAt', WEEK_AGO), eq('name', 'none')) }), allowed());

        expect(meta.total).toEqual(1);
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

        const { data, meta } = await roleStats.getMany(wire({ groups: [] }), makeActor());

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

        const { data, meta } = await realmStats.getMany(wire({ groups: [] }), makeActor({ allow: true, identity: false }), { realmId });

        expect(data).toEqual([{ createdAt: TODAY, count: 2 }]);
        expect(meta.total).toEqual(2);
    });

    it('keys the cache by the statistic', async () => {
        seed();

        const actor = allowed();
        const other = new FakeEntityStatsRepository<Event>();
        const otherStats = new EntityStatsService({
            definition: { ...defineEventStats(other), type: 'other' },
            cache,
        });

        await service.getMany(wire(), actor);
        const { data } = await otherStats.getMany(wire(), actor);

        expect(data).toHaveLength(0);
        expect(other.aggregateCalls).toHaveLength(1);
    });

    it('computes the window-independent total once for every window over one scope', async () => {
        seed();

        const actor = allowed();
        const daily = await service.getMany(wire(), actor);
        const hourly = await service.getMany(wire({
            from: new Date(Date.now() - DAY_IN_MS).toISOString(),
            unit: 'hour',
        }), actor);

        expect(repository.aggregateCalls).toHaveLength(2);
        expect(repository.countCalls).toHaveLength(1);
        expect(hourly.meta.total).toEqual(daily.meta.total);
    });
});
