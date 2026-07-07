/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { BuiltInPolicyType } from '@authup/access';
import type { Session, User } from '@authup/core-kit';
import { IdentityType } from '@authup/core-kit';
import type { ActorContext } from '@authup/server-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
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
                realm_id: realmId,
            } as User,
        };
    }

    return actor;
}

describe('SessionService', () => {
    let repository: FakeSessionRepository;
    let service: SessionService;

    beforeEach(() => {
        repository = new FakeSessionRepository();
        service = new SessionService({ repository });
    });

    function seedOwn(): Session {
        return repository.seed({
            sub: userId, 
            sub_kind: IdentityType.USER, 
            realm_id: realmId,
        });
    }
    function seedOther(): Session {
        return repository.seed({
            sub: otherUserId, 
            sub_kind: IdentityType.USER, 
            realm_id: realmId,
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

        it('drops rows a privileged actor is not authorized for (realm reach)', async () => {
            seedOwn();
            seedOther();
            seedOther();

            const evaluator = new FakePermissionEvaluator();
            // preEvaluate passes (has the permission) but per-row evaluate denies
            evaluator.deny('evaluate');
            const actor: ActorContext = {
                permissionEvaluator: evaluator,
                identity: { type: IdentityType.USER, data: { id: userId, realm_id: realmId } as User },
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
    });

    describe('deleteManyForActor', () => {
        it('revokes every own session except the current one', async () => {
            const s1 = seedOwn();
            const current = seedOwn();
            const s3 = seedOwn();
            seedOther();

            const actor = makeActor({ allow: false });
            const { count } = await service.deleteManyForActor(actor, current.id);

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
            const { count } = await service.deleteManyForActor(actor);

            expect(count).toEqual(2);
        });

        it('throws for an identity-less actor', async () => {
            const actor = makeActor({ allow: true, identity: false });
            await expect(service.deleteManyForActor(actor)).rejects.toBeDefined();
        });
    });

    describe('deleteManyForOwner', () => {
        const owner = { sub: otherUserId, subKind: IdentityType.USER };

        it('revokes every session of the target subject', async () => {
            const s1 = seedOther();
            const s2 = seedOther();
            seedOwn();

            const actor = makeActor({ allow: true });
            const { count } = await service.deleteManyForOwner(actor, owner);

            expect(count).toEqual(2);
            const removed = repository.removeCalls.map((s) => s.id);
            expect(removed).toContain(s1.id);
            expect(removed).toContain(s2.id);
        });

        it('revokes only sessions within the actor realm reach (drops cross-realm)', async () => {
            const otherRealmId = randomUUID();
            const inReach1 = seedOther();
            const inReach2 = seedOther();
            const outOfReach = repository.seed({
                sub: otherUserId,
                sub_kind: IdentityType.USER,
                realm_id: otherRealmId,
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
                identity: { type: IdentityType.USER, data: { id: userId, realm_id: realmId } as User },
            };

            const { count } = await service.deleteManyForOwner(actor, owner);

            expect(count).toEqual(2);
            const removed = repository.removeCalls.map((s) => s.id);
            expect(removed).toContain(inReach1.id);
            expect(removed).toContain(inReach2.id);
            expect(removed).not.toContain(outOfReach.id);
        });

        it('throws for an actor without the delete permission', async () => {
            seedOther();

            const actor = makeActor({ allow: false });
            await expect(service.deleteManyForOwner(actor, owner)).rejects.toBeDefined();
            expect(repository.removeCalls).toHaveLength(0);
        });

        it('returns count 0 when the target has no sessions', async () => {
            seedOwn();

            const actor = makeActor({ allow: true });
            const { count } = await service.deleteManyForOwner(actor, owner);

            expect(count).toEqual(0);
            expect(repository.removeCalls).toHaveLength(0);
        });
    });
});
