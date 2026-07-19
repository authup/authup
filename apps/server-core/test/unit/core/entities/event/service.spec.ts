/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { BuiltInPolicyType } from '@authup/access';
import type { Event, User } from '@authup/core-kit';
import { EventName, EventScope, IdentityType } from '@authup/core-kit';
import type { ActorContext } from '@authup/server-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import { EventService } from '../../../../../src/core/entities/event/service.ts';
import type { EventServiceOptions } from '../../../../../src/core/index.ts';
import { FakeEventRepository } from './fake-repository.ts';

const DAY_IN_MS = 86_400_000;

const realmId = randomUUID();
const otherRealmId = randomUUID();
const userId = randomUUID();
const otherUserId = randomUUID();

function makeActor(options: { allow: boolean, identity?: boolean } = { allow: true }): ActorContext {
    const evaluator = new FakePermissionEvaluator();
    if (!options.allow) {
        evaluator.denyAll();
    }

    const actor: ActorContext = { permissionEvaluator: evaluator };
    if (options.identity !== false) {
        actor.identity = {
            type: IdentityType.USER,
            data: {
                id: userId,
                realmId,
            } as User,
        };
    }

    return actor;
}

describe('EventService', () => {
    let repository: FakeEventRepository;
    let service: EventService;

    beforeEach(() => {
        repository = new FakeEventRepository();
        service = new EventService({ repository });
    });

    function buildService(options: EventServiceOptions): EventService {
        return new EventService({ repository, options });
    }

    function seedOwn(data: Partial<Event> = {}): Event {
        return repository.seed({
            scope: EventScope.OAUTH2,
            name: EventName.LOGIN,
            actorType: IdentityType.USER,
            actorId: userId,
            realmId,
            ...data,
        });
    }

    function seedForeign(data: Partial<Event> = {}): Event {
        return repository.seed({
            scope: EventScope.OAUTH2,
            name: EventName.LOGIN,
            actorType: IdentityType.USER,
            actorId: otherUserId,
            realmId,
            ...data,
        });
    }

    describe('record', () => {
        it('persists a row with a generated id', async () => {
            await service.record({
                scope: EventScope.OAUTH2,
                name: EventName.LOGIN,
                actorType: IdentityType.USER,
                actorId: userId,
                actorName: 'test-user',
                realmId,
            });

            expect(repository.rows).toHaveLength(1);
            const [row] = repository.rows;
            expect(row.id).toBeTypeOf('string');
            expect(row.id.length).toBeGreaterThan(0);
            expect(row.scope).toEqual(EventScope.OAUTH2);
            expect(row.name).toEqual(EventName.LOGIN);
            expect(row.actorType).toEqual(IdentityType.USER);
            expect(row.actorId).toEqual(userId);
            expect(row.actorName).toEqual('test-user');
            expect(row.realmId).toEqual(realmId);
        });

        it('strips secrets from the context data via the sanitizer', async () => {
            await service.record({
                scope: EventScope.OAUTH2,
                name: EventName.LOGIN_FAILED,
                data: {
                    grantType: 'password',
                    errorCode: 'entity_credentials_invalid',
                    password: 'super-secret',
                    client_secret: 'also-secret',
                },
            });

            expect(repository.rows).toHaveLength(1);
            expect(repository.rows[0].data).toEqual({
                grantType: 'password',
                errorCode: 'entity_credentials_invalid',
            });
        });

        it('stamps expires_at from the configured retention window', async () => {
            const retentionDays = 30;
            await buildService({ retentionDays }).record({
                scope: EventScope.OAUTH2,
                name: EventName.LOGIN,
            });

            const [row] = repository.rows;
            expect(row.expiring).toBeTruthy();
            expect(row.expiresAt).not.toBeNull();
            const delta = new Date(row.expiresAt!).getTime() -
                (Date.now() + (retentionDays * DAY_IN_MS));
            expect(Math.abs(delta)).toBeLessThan(60_000);
        });

        it('defaults the retention to 90 days', async () => {
            await service.record({
                scope: EventScope.OAUTH2,
                name: EventName.LOGIN,
            });

            const [row] = repository.rows;
            expect(row.expiresAt).not.toBeNull();
            const delta = new Date(row.expiresAt!).getTime() -
                (Date.now() + (90 * DAY_IN_MS));
            expect(Math.abs(delta)).toBeLessThan(60_000);
        });

        it('honors a per-event retentionDays override for expiring/expires_at', async () => {
            const retentionDays = 7;
            await buildService({ retentionDays: 365 }).record({
                scope: EventScope.ENTITY,
                name: EventName.CREATED,
                retentionDays,
            });

            const [row] = repository.rows;
            expect(row.expiring).toBeTruthy();
            expect(row.expiresAt).not.toBeNull();
            const delta = new Date(row.expiresAt!).getTime() -
                (Date.now() + (retentionDays * DAY_IN_MS));
            expect(Math.abs(delta)).toBeLessThan(60_000);
        });

        it('keeps rows forever when the per-event override is 0', async () => {
            await buildService({ retentionDays: 365 }).record({
                scope: EventScope.ENTITY,
                name: EventName.CREATED,
                retentionDays: 0,
            });

            const [row] = repository.rows;
            expect(row.expiring).toBeFalsy();
            expect(row.expiresAt).toBeNull();
        });

        it('keeps rows forever when retentionDays is 0', async () => {
            await buildService({ retentionDays: 0 }).record({
                scope: EventScope.OAUTH2,
                name: EventName.LOGIN,
            });

            expect(repository.rows).toHaveLength(1);
            expect(repository.rows[0].expiring).toBeFalsy();
            expect(repository.rows[0].expiresAt).toBeNull();
        });

        it('persists nothing when disabled', async () => {
            await buildService({ enabled: false }).record({
                scope: EventScope.OAUTH2,
                name: EventName.LOGIN,
            });

            expect(repository.rows).toHaveLength(0);
        });

        it('resolves without throwing when the repository save fails (fire-and-forget)', async () => {
            repository.saveError = new Error('database unavailable');

            await expect(service.record({
                scope: EventScope.OAUTH2,
                name: EventName.LOGIN,
            })).resolves.toBeUndefined();

            expect(repository.rows).toHaveLength(0);
        });
    });

    describe('getMany', () => {
        it('scopes an actor without event_read to its own rows', async () => {
            seedOwn();
            seedOwn();
            const foreign = seedForeign();

            const actor = makeActor({ allow: false });
            const { data } = await service.getMany({}, actor);

            expect(data).toHaveLength(2);
            expect(data.every((row) => row.actorId === userId)).toBe(true);
            expect(data.some((row) => row.id === foreign.id)).toBe(false);
        });

        it('rejects an anonymous (identity-less) actor without the read permission', async () => {
            const actor = makeActor({ allow: false, identity: false });
            await expect(service.getMany({}, actor)).rejects.toBeDefined();
        });

        it('returns all rows for a permitted actor', async () => {
            seedOwn();
            seedForeign();

            const actor = makeActor({ allow: true });
            const { data, meta } = await service.getMany({}, actor);

            expect(data).toHaveLength(2);
            expect(meta.total).toEqual(2);
        });

        it('applies the route realm as a mandatory repository constraint', async () => {
            const ownRealm = seedForeign();
            seedForeign({ realmId: otherRealmId });

            const actor = makeActor({ allow: true });
            const { data, meta } = await service.getMany({}, actor, { realmId });

            expect(data.map((row) => row.id)).toEqual([ownRealm.id]);
            expect(meta.total).toEqual(1);
        });

        it('combines the route realm with the self-service owner constraint', async () => {
            const ownRealm = seedOwn();
            seedOwn({ realmId: otherRealmId });

            const actor = makeActor({ allow: false });
            const { data, meta } = await service.getMany({}, actor, { realmId });

            expect(data.map((row) => row.id)).toEqual([ownRealm.id]);
            expect(meta.total).toEqual(1);
        });

        it('applies actor realm reach before pagination', async () => {
            const ownRealm = seedForeign();
            const global = seedForeign({ realmId: null });
            seedForeign({ realmId: otherRealmId });

            const actor = makeActor({ allow: true });
            (actor.permissionEvaluator as FakePermissionEvaluator).setBehavior(({ method, ctx }) => {
                if (method !== 'evaluate') {
                    return;
                }

                const resourceRealm = ctx.data?.get<string | null>(BuiltInPolicyType.REALM_MATCH);
                if (resourceRealm !== realmId && resourceRealm !== null) {
                    throw new Error('Realm denied');
                }
            });

            const { data, meta } = await service.getMany({}, actor);

            expect(data.map((row) => row.id)).toEqual([ownRealm.id, global.id]);
            expect(meta.total).toEqual(2);
        });

        it('preserves the backing total when all page rows are authorized', async () => {
            const visible = seedForeign();
            repository.findMany = async () => ({
                data: [visible],
                meta: {
                    total: 125,
                    limit: 50,
                    offset: 0,
                },
            });

            const actor = makeActor({ allow: true });
            const { data, meta } = await service.getMany({}, actor);

            expect(data).toHaveLength(1);
            expect(meta.total).toEqual(125);
        });

        it('subtracts rows denied during per-row authorization from the backing total', async () => {
            const visible = seedForeign();
            const denied = seedForeign();
            repository.findMany = async () => ({
                data: [visible, denied],
                meta: {
                    total: 125,
                    limit: 50,
                    offset: 0,
                },
            });

            const actor = makeActor({ allow: true });
            (actor.permissionEvaluator as FakePermissionEvaluator).setBehavior(({ method, ctx }) => {
                if (method !== 'evaluate' || ctx.options?.policiesIncluded) {
                    return;
                }

                const attributes = ctx.data?.get<Event>(BuiltInPolicyType.ATTRIBUTES);
                if (attributes?.id === denied.id) {
                    throw new Error('Event denied');
                }
            });
            const { data, meta } = await service.getMany({}, actor);

            expect(data.map((row) => row.id)).toEqual([visible.id]);
            expect(meta.total).toEqual(124);
        });

        it('drops rows a privileged actor is not authorized for (realm reach)', async () => {
            seedOwn();
            seedForeign();
            seedForeign();

            // preEvaluate passes (holds the permission) but per-row evaluate denies
            const evaluator = new FakePermissionEvaluator();
            evaluator.deny('evaluate');
            const actor: ActorContext = {
                permissionEvaluator: evaluator,
                identity: { type: IdentityType.USER, data: { id: userId, realmId } as User },
            };

            const { data, meta } = await service.getMany({}, actor);

            // only the actor's own rows survive (owned rows skip the evaluate)
            expect(data).toHaveLength(1);
            expect(data[0].actorId).toEqual(userId);
            expect(meta.total).toEqual(1);
        });
    });

    describe('getOne', () => {
        it('returns an own row with no permission check', async () => {
            const row = seedOwn();
            const actor = makeActor({ allow: false });

            const result = await service.getOne(row.id, actor);
            expect(result.id).toEqual(row.id);
            expect((actor.permissionEvaluator as FakePermissionEvaluator).preEvaluateCalls).toHaveLength(0);
        });

        it("denies reading another actor's row without permission", async () => {
            const row = seedForeign();
            const actor = makeActor({ allow: false });

            await expect(service.getOne(row.id, actor)).rejects.toBeDefined();
        });

        it("allows a privileged actor to read another actor's row", async () => {
            const row = seedForeign();
            const actor = makeActor({ allow: true });

            const result = await service.getOne(row.id, actor);
            expect(result.id).toEqual(row.id);
        });

        it('hides a row outside the route realm before checking ownership', async () => {
            const row = seedOwn({ realmId: otherRealmId });
            const actor = makeActor({ allow: false });

            await expect(service.getOne(row.id, actor, { realmId })).rejects.toBeDefined();
            expect((actor.permissionEvaluator as FakePermissionEvaluator).preEvaluateCalls).toHaveLength(0);
        });

        it('throws when the row does not exist', async () => {
            const actor = makeActor({ allow: true });
            await expect(service.getOne(randomUUID(), actor)).rejects.toBeDefined();
        });
    });

    it('exposes a read/record-only surface (append-only log)', () => {
        // the log is append-only: writes happen via record(), pruning via the
        // retention sweep — the service must not grow mutation methods.
        const methods = Object.getOwnPropertyNames(EventService.prototype);
        expect(methods).not.toContain('create');
        expect(methods).not.toContain('update');
        expect(methods).not.toContain('save');
        expect(methods).not.toContain('delete');
    });
});
