/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { BuiltInPolicyType } from '@authup/access';
import { eq } from '@rapiq/core';
import { applyQuery } from '@rapiq/adapter-memory';
import type { Session, User } from '@authup/core-kit';
import { IdentityType } from '@authup/core-kit';
import type { ActorContext } from '@authup/server-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import { SessionManager } from '../../../../../src/core/authentication/session/module.ts';
import { SessionService } from '../../../../../src/core/entities/session/service.ts';
import { FakeSessionRepository } from './fake-repository.ts';

const realmId = randomUUID();
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

describe('SessionService', () => {
    let repository: FakeSessionRepository;
    let sessionManager: SessionManager;
    let service: SessionService;

    beforeEach(() => {
        repository = new FakeSessionRepository();
        // the real manager over the fake rows: every revoke below has to reach
        // the repository THROUGH it, since that is the back-channel chokepoint
        sessionManager = new SessionManager({ repository, options: { maxAge: 3_600 } });
        service = new SessionService({ repository, sessionManager });
    });

    function seedOwn(): Session {
        return repository.seed({
            sub: userId,
            subKind: IdentityType.USER,
            userId,
            realmId,
        });
    }
    function seedOther(): Session {
        return repository.seed({
            sub: otherUserId,
            subKind: IdentityType.USER,
            userId: otherUserId,
            realmId,
        });
    }

    describe('getMany', () => {
        it('scopes a non-privileged actor to its own sessions', async () => {
            seedOwn();
            seedOwn();
            seedOther();

            const actor = makeActor({ allow: false });
            const { data } = await service.getMany({}, actor);

            expect(data).toHaveLength(2);
            expect(data.every((s) => s.sub === userId)).toBe(true);
        });

        it('rejects an anonymous (identity-less) actor without the read permission', async () => {
            const actor = makeActor({ allow: false, identity: false });
            await expect(service.getMany({}, actor)).rejects.toBeDefined();
        });

        it('composes ownership with a compiled conditional as WHERE and skips per-row evaluation', async () => {
            const own = seedOwn();
            const foreignSameRealm = seedOther();
            const foreignOtherRealm = repository.seed({
                sub: otherUserId,
                subKind: IdentityType.USER,
                userId: otherUserId,
                realmId: randomUUID(),
            });

            const actor = makeActor({ allow: true });
            (actor.permissionEvaluator as FakePermissionEvaluator).setCompileResult({
                verdict: 'conditional',
                condition: eq('realmId', realmId),
            });

            const spy = vi.spyOn(repository, 'findMany');
            await service.getMany({}, actor);

            // the fake repository does not apply filters — replay the query the
            // service built over the seeded rows instead
            const query = spy.mock.calls[0]![0];
            const applied = applyQuery(query, [own, foreignSameRealm, foreignOtherRealm]);
            expect(applied.data.map((row) => row.id).sort())
                .toEqual([own.id, foreignSameRealm.id].sort());

            expect((actor.permissionEvaluator as FakePermissionEvaluator).evaluateCalls).toHaveLength(0);
        });

        it('restricts to own rows on a compiled deny', async () => {
            const own = seedOwn();
            const foreign = seedOther();

            const actor = makeActor({ allow: true });
            (actor.permissionEvaluator as FakePermissionEvaluator).setCompileResult({ verdict: 'deny' });

            const spy = vi.spyOn(repository, 'findMany');
            await service.getMany({}, actor);

            const query = spy.mock.calls[0]![0];
            const applied = applyQuery(query, [own, foreign]);
            expect(applied.data.map((row) => row.id)).toEqual([own.id]);
            expect((actor.permissionEvaluator as FakePermissionEvaluator).evaluateCalls).toHaveLength(0);
        });

        it('drops rows a privileged actor is not authorized for (realm reach)', async () => {
            seedOwn();
            seedOther();
            seedOther();

            const evaluator = new FakePermissionEvaluator();
            // preEvaluate passes (has the permission) but per-row evaluate denies
            evaluator.deny('evaluate');
            const actor: ActorContext = {
                permissionEvaluator: evaluator,
                identity: { type: IdentityType.USER, data: { id: userId, realmId } as User },
            };

            const { data, meta } = await service.getMany({}, actor);

            // only the actor's own session survives (owned rows skip the evaluate)
            expect(data).toHaveLength(1);
            expect(data[0].sub).toEqual(userId);
            expect(meta.total).toEqual(1);
        });
    });

    describe('getOne', () => {
        it('returns an own session with no permission check', async () => {
            const session = seedOwn();
            const actor = makeActor({ allow: false });

            const result = await service.getOne(session.id, actor);
            expect(result.id).toEqual(session.id);
            expect((actor.permissionEvaluator as FakePermissionEvaluator).preEvaluateCalls).toHaveLength(0);
        });

        it("denies reading another subject's session without permission", async () => {
            const session = seedOther();
            const actor = makeActor({ allow: false });

            await expect(service.getOne(session.id, actor)).rejects.toBeDefined();
        });

        it("allows a privileged actor to read another subject's session", async () => {
            const session = seedOther();
            const actor = makeActor({ allow: true });

            const result = await service.getOne(session.id, actor);
            expect(result.id).toEqual(session.id);
        });

        it('throws when the session does not exist', async () => {
            const actor = makeActor({ allow: true });
            await expect(service.getOne(randomUUID(), actor)).rejects.toBeDefined();
        });
    });

    describe('delete', () => {
        it('revokes an own session with no permission check', async () => {
            const session = seedOwn();
            const actor = makeActor({ allow: false });

            await service.delete(session.id, actor);
            expect(repository.removeCalls.map((s) => s.id)).toContain(session.id);
        });

        it("denies revoking another subject's session without permission", async () => {
            const session = seedOther();
            const actor = makeActor({ allow: false });

            await expect(service.delete(session.id, actor)).rejects.toBeDefined();
            expect(repository.removeCalls).toHaveLength(0);
        });

        it("allows a privileged actor to revoke another subject's session", async () => {
            const session = seedOther();
            const actor = makeActor({ allow: true });

            await service.delete(session.id, actor);
            expect(repository.removeCalls.map((s) => s.id)).toContain(session.id);
        });

        it('routes the revoke through the session manager and keeps the id on the answer', async () => {
            const session = seedOwn();
            const actor = makeActor({ allow: false });
            const revoke = vi.spyOn(sessionManager, 'revoke');

            const result = await service.delete(session.id, actor);

            expect(revoke).toHaveBeenCalledWith(session.id);
            expect(result.id).toEqual(session.id);
            expect(await repository.findOneById(session.id)).toBeNull();
        });
    });

    describe('deleteMany (self-service — no target filter)', () => {
        it('revokes every own session except the current one', async () => {
            const s1 = seedOwn();
            const current = seedOwn();
            const s3 = seedOwn();
            seedOther();

            const actor = makeActor({ allow: false });
            const { count } = await service.deleteMany(actor, { currentSessionId: current.id });

            expect(count).toEqual(2);
            const removed = repository.removeCalls.map((s) => s.id);
            expect(removed).toContain(s1.id);
            expect(removed).toContain(s3.id);
            expect(removed).not.toContain(current.id);
        });

        it('revokes all own sessions when no current session is given', async () => {
            seedOwn();
            seedOwn();

            const actor = makeActor({ allow: false });
            const { count } = await service.deleteMany(actor);

            expect(count).toEqual(2);
        });

        it('routes every revoke through the session manager', async () => {
            const s1 = seedOwn();
            const s2 = seedOwn();
            const revoke = vi.spyOn(sessionManager, 'revoke');

            const actor = makeActor({ allow: false });
            await service.deleteMany(actor);

            expect(revoke.mock.calls.map(([id]) => id).sort()).toEqual([s1.id, s2.id].sort());
        });

        it('needs no permission (self-service) even with an empty/unrecognized filter', async () => {
            seedOwn();
            seedOther();

            // an unrecognized filter key must NOT trigger an admin mass-delete;
            // it falls through to the self path (deny-all actor still succeeds).
            const actor = makeActor({ allow: false });
            const { count } = await service.deleteMany(actor, { query: { filter: { foobar: 'x' } } });

            expect(count).toEqual(1); // only the actor's own session
        });

        it('throws for an identity-less actor', async () => {
            const actor = makeActor({ allow: true, identity: false });
            await expect(service.deleteMany(actor)).rejects.toBeDefined();
        });
    });

    describe('deleteMany (admin bulk revoke — target filter)', () => {
        function adminQuery(userIds: string | string[]): Record<string, any> {
            return { filter: { userId: Array.isArray(userIds) ? userIds.join(',') : userIds } };
        }

        it('revokes every session matching filter[userId]', async () => {
            const s1 = seedOther();
            const s2 = seedOther();
            seedOwn();

            const actor = makeActor({ allow: true });
            const { count } = await service.deleteMany(actor, { query: adminQuery(otherUserId) });

            expect(count).toEqual(2);
            const removed = repository.removeCalls.map((s) => s.id);
            expect(removed).toContain(s1.id);
            expect(removed).toContain(s2.id);
        });

        it('targets multiple subjects via a comma-separated filter[userId]', async () => {
            const thirdUserId = randomUUID();
            const a = seedOther();
            const b = repository.seed({
                sub: thirdUserId,
                subKind: IdentityType.USER,
                userId: thirdUserId,
                realmId,
            });
            seedOwn();

            const actor = makeActor({ allow: true });
            const { count } = await service.deleteMany(actor, { query: adminQuery([otherUserId, thirdUserId]) });

            expect(count).toEqual(2);
            const removed = repository.removeCalls.map((s) => s.id);
            expect(removed).toContain(a.id);
            expect(removed).toContain(b.id);
        });

        it('revokes only sessions within the actor realm reach (drops cross-realm)', async () => {
            const otherRealmId = randomUUID();
            const inReach1 = seedOther();
            const inReach2 = seedOther();
            const outOfReach = repository.seed({
                sub: otherUserId,
                subKind: IdentityType.USER,
                userId: otherUserId,
                realmId: otherRealmId,
            });

            // preEvaluate (gate) passes; per-session evaluate denies when the
            // resource realm is outside the actor's own realm.
            const evaluator = new FakePermissionEvaluator();
            evaluator.setBehavior((call) => {
                if (call.method !== 'evaluate') {
                    return;
                }
                const resourceRealm = call.ctx.data?.has(BuiltInPolicyType.REALM_MATCH) ?
                    call.ctx.data.get(BuiltInPolicyType.REALM_MATCH) :
                    undefined;
                if (resourceRealm !== realmId) {
                    throw new Error('out of realm reach');
                }
            });
            const actor: ActorContext = {
                permissionEvaluator: evaluator,
                identity: { type: IdentityType.USER, data: { id: userId, realmId } as User },
            };

            const { count } = await service.deleteMany(actor, { query: adminQuery(otherUserId) });

            expect(count).toEqual(2);
            const removed = repository.removeCalls.map((s) => s.id);
            expect(removed).toContain(inReach1.id);
            expect(removed).toContain(inReach2.id);
            expect(removed).not.toContain(outOfReach.id);
        });

        it('throws for an actor without the delete permission', async () => {
            seedOther();

            const actor = makeActor({ allow: false });
            await expect(
                service.deleteMany(actor, { query: adminQuery(otherUserId) }),
            ).rejects.toBeDefined();
            expect(repository.removeCalls).toHaveLength(0);
        });

        it('returns count 0 when the target has no sessions', async () => {
            seedOwn();

            const actor = makeActor({ allow: true });
            const { count } = await service.deleteMany(actor, { query: adminQuery(otherUserId) });

            expect(count).toEqual(0);
            expect(repository.removeCalls).toHaveLength(0);
        });
    });
});
