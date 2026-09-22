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
    EventStatsGranularity,
    IdentityType,
    PermissionName,
} from '@authup/core-kit';
import type { EntityQueryInput } from '@authup/core-http-kit';
import { buildQueryString } from '@authup/core-http-kit';
import { isValidationError } from '@authup/errors';
import type { ActorContext } from '@authup/server-kit';
import { MemoryCache } from '@authup/server-kit';
import { eq } from '@rapiq/core';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import { EventStatsService } from '../../../../../src/core/entities/event/stats.ts';
import { EVENT_STATS_MAX_BUCKETS } from '../../../../../src/core/index.ts';
import { FakeEventRepository } from './fake-repository.ts';

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

describe('EventStatsService', () => {
    let repository: FakeEventRepository;
    let cache: MemoryCache;
    let service: EventStatsService;

    beforeEach(() => {
        repository = new FakeEventRepository();
        cache = new MemoryCache();
        service = new EventStatsService({ repository, cache });
    });

    function seed(data: Record<string, unknown> = {}) {
        return repository.seed({
            scope: EventScope.OAUTH2,
            name: EventName.LOGIN,
            actorType: IdentityType.USER,
            actorId: otherUserId,
            realmId,
            ...data,
        });
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
        expect(meta.granularity).toEqual(EventStatsGranularity.DAY);
        expect(meta.days).toEqual(30);
        expect(meta.enabled).toBe(true);

        const [call] = repository.countGroupedCalls;
        expect(call.options.owner).toBeUndefined();
        expect(call.options.realmId).toBeUndefined();
    });

    it('buckets by hour when asked to', async () => {
        seed();
        seed({ createdAt: new Date(Date.now() - (2 * HOUR_IN_MS)).toISOString() });

        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        const { data, meta } = await service.getMany({ granularity: 'hour', days: 1 }, actor);

        expect(meta.granularity).toEqual(EventStatsGranularity.HOUR);
        expect(data.map((row) => row.bucket)).toEqual(expect.arrayContaining([
            startOfUTCHour(new Date()),
            startOfUTCHour(new Date(Date.now() - (2 * HOUR_IN_MS))),
        ]));
        expect(data.every((row) => row.count === 1)).toBe(true);
    });

    it('snaps the window start onto a bucket boundary and reports the window', async () => {
        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        const before = Date.now();
        const { meta } = await service.getMany({ days: 7 }, actor);

        expect(meta.from).toEqual(startOfUTCDay(new Date(before - (7 * DAY_IN_MS))));
        expect(new Date(meta.to).getTime()).toBeGreaterThanOrEqual(before);
        expect(repository.countGroupedCalls[0].options.from).toEqual(meta.from);
    });

    it('leaves rows created before the window out', async () => {
        seed();
        seed({ createdAt: new Date(Date.now() - (40 * DAY_IN_MS)).toISOString() });

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
        expect(repository.countGroupedCalls[0].options.owner).toEqual({
            actorId: userId,
            actorType: IdentityType.USER,
        });
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
        expect(repository.countGroupedCalls[0].options.owner).toBeUndefined();
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
        expect(repository.countGroupedCalls[0].options.owner).toEqual({
            actorId: userId,
            actorType: IdentityType.USER,
        });
        expect(evaluatorOf(actor).evaluateCalls).toHaveLength(0);
    });

    it('falls back to own rows when the reach compiles to deny', async () => {
        seed({ actorId: userId });
        seed();

        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'deny' });

        const { data } = await service.getMany({}, actor);

        expect(data).toHaveLength(1);
        expect(repository.countGroupedCalls[0].options.owner).toEqual({
            actorId: userId,
            actorType: IdentityType.USER,
        });
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
        expect(repository.countGroupedCalls[0].options.realmId).toEqual(realmId);
    });

    it('refuses a window past the bucket ceiling', async () => {
        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        const hourly = (EVENT_STATS_MAX_BUCKETS / 24) + 1;
        await expect(service.getMany({ granularity: 'hour', days: hourly }, actor))
            .rejects.toSatisfy(isValidationError);
        await expect(service.getMany({ days: EVENT_STATS_MAX_BUCKETS + 1 }, actor))
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

    it('reports a disabled event log', async () => {
        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        const { meta } = await new EventStatsService({
            repository,
            cache,
            options: { enabled: false },
        }).getMany({}, actor);

        expect(meta.enabled).toBe(false);
    });

    it('asks the evaluator for the event read permission only', async () => {
        const actor = makeActor();
        evaluatorOf(actor).setCompileResult({ verdict: 'allow' });

        await service.getMany({}, actor);

        expect(evaluatorOf(actor).preEvaluateCalls.map((call) => call.name)).toEqual([PermissionName.EVENT_READ]);
        expect(evaluatorOf(actor).compileCalls.map((call) => call.name)).toEqual([PermissionName.EVENT_READ]);
    });
});
