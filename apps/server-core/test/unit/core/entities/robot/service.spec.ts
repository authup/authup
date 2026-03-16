/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import {
    IdentityType,
    PermissionName,
} from '@authup/core-kit';
import type { Realm, Robot, User } from '@authup/core-kit';
import {
    beforeEach, describe, expect, it, vi,
} from 'vitest';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { RobotService } from '../../../../../src/core/entities/robot/service.ts';
import type { IRobotRepository } from '../../../../../src/core/entities/robot/types.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import { FakeRealmRepository } from '../../helpers/fake-realm-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
    createNonMasterRealmActor,
} from '../../helpers/mock-actor.ts';
import type { ActorContext } from '../../../../../src/core/entities/actor/types.ts';

class FakeRobotRepository extends FakeEntityRepository<Robot> implements IRobotRepository {
    async checkUniqueness(): Promise<void> {
        // no-op
    }

    async findOneWithSecret(where: Record<string, any>): Promise<Robot | null> {
        return this.findOneBy(where);
    }
}

function createUserActorAsOwner(userId: string): ActorContext {
    const realmId = randomUUID();
    return {
        permissionChecker: {
            check: vi.fn().mockResolvedValue(undefined),
            checkOneOf: vi.fn().mockResolvedValue(undefined),
            preCheck: vi.fn().mockResolvedValue(undefined),
            preCheckOneOf: vi.fn().mockResolvedValue(undefined),
        },
        identity: {
            type: IdentityType.USER,
            data: {
                id: userId,
                realm_id: realmId,
                realm: { id: realmId, name: 'test' } as Realm,
            } as User,
        },
    };
}

describe('core/entities/robot/service', () => {
    let repository: FakeRobotRepository;
    let realmRepository: FakeRealmRepository;
    let service: RobotService;

    beforeEach(() => {
        repository = new FakeRobotRepository();
        realmRepository = new FakeRealmRepository();
        service = new RobotService({ repository, realmRepository });
    });

    describe('getMany', () => {
        it('should return entities when actor has permission', async () => {
            repository.seed([{ id: randomUUID(), name: 'robot-a' } as Robot]);
            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('should include self-access entities without per-record check', async () => {
            const robotId = randomUUID();
            const otherRobotId = randomUUID();
            const realmId = randomUUID();

            repository.seed([
                { id: robotId, name: 'self-robot' } as Robot,
                { id: otherRobotId, name: 'other-robot' } as Robot,
            ]);

            const actor: ActorContext = {
                permissionChecker: {
                    check: vi.fn().mockResolvedValue(undefined),
                    checkOneOf: vi.fn().mockResolvedValue(undefined),
                    preCheck: vi.fn().mockResolvedValue(undefined),
                    preCheckOneOf: vi.fn().mockResolvedValue(undefined),
                },
                identity: {
                    type: IdentityType.ROBOT,
                    data: {
                        id: robotId,
                        realm_id: realmId,
                        realm: { id: realmId, name: 'test' } as Realm,
                    } as Robot,
                },
            };

            vi.mocked(actor.permissionChecker.checkOneOf).mockRejectedValue(new ForbiddenError());

            const result = await service.getMany({}, actor);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].id).toBe(robotId);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toThrow(ForbiddenError);
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'test-robot' } as Robot]);
            const result = await service.getOne(id, createAllowAllActor());
            expect(result.name).toBe('test-robot');
        });

        it('should return entity by name', async () => {
            repository.seed([{ id: randomUUID(), name: 'my-robot' } as Robot]);
            const result = await service.getOne('my-robot', createAllowAllActor());
            expect(result.name).toBe('my-robot');
        });

        it('should call checkOneOf (not check) for per-record permission', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'test-robot' } as Robot]);
            const actor = createAllowAllActor();
            await service.getOne(id, actor);
            expect(actor.permissionChecker.checkOneOf).toHaveBeenCalled();
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.getOne(randomUUID(), createAllowAllActor())).rejects.toThrow(NotFoundError);
        });
    });

    describe('create', () => {
        it('should create a robot with valid data', async () => {
            const result = await service.create(
                { name: 'new-robot' },
                createAllowAllActor(),
            );

            expect(result.id).toBeDefined();
            expect(result.name).toBe('new-robot');
        });

        it('should generate secret on create', async () => {
            const result = await service.create(
                { name: 'secret-robot' },
                createAllowAllActor(),
            );

            expect(result.secret).toBeDefined();
            expect(result.secret!.length).toBeGreaterThan(0);
        });

        it('should return plaintext secret after create (not the hash)', async () => {
            const result = await service.create(
                { name: 'plain-secret-robot' },
                createAllowAllActor(),
            );

            expect(result.secret).toBeDefined();
            expect(result.secret).not.toMatch(/^\$2[aby]\$/);
        });

        it('should call preCheck with ROBOT_CREATE', async () => {
            const actor = createAllowAllActor();
            await service.create({ name: 'test-robot' }, actor);
            expect(actor.permissionChecker.preCheck).toHaveBeenCalledWith({
                name: PermissionName.ROBOT_CREATE,
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({ name: 'test-robot' }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should set realm_id from actor for non-master realm', async () => {
            const realmId = randomUUID();
            const actor = createNonMasterRealmActor(realmId);

            const result = await service.create({ name: 'realm-robot' }, actor);
            expect(result.realm_id).toBe(realmId);
        });
    });

    describe('update', () => {
        it('should update an existing robot', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'old-name' } as Robot]);

            const result = await service.update(id, { name: 'new-name' }, createAllowAllActor());
            expect(result.name).toBe('new-name');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update(randomUUID(), { name: 'x' }, createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should return plaintext secret after update with new secret', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'robot' } as Robot]);

            const result = await service.update(id, { secret: 'new-secret-value' }, createAllowAllActor());
            expect(result.secret).toBe('new-secret-value');
        });
    });

    describe('delete', () => {
        it('should delete an existing robot', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'deletable' } as Robot]);
            const result = await service.delete(id, createAllowAllActor());
            expect(result.id).toBe(id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete(randomUUID(), createAllowAllActor())).rejects.toThrow(NotFoundError);
        });

        it('should call preCheck with ROBOT_DELETE for non-owner', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'test', user_id: null } as Robot]);
            const actor = createAllowAllActor();
            await service.delete(id, actor);
            expect(actor.permissionChecker.preCheck).toHaveBeenCalledWith({
                name: PermissionName.ROBOT_DELETE,
            });
        });

        it('should not call preCheck for owner delete', async () => {
            const userId = randomUUID();
            const robotId = randomUUID();
            repository.seed([{ id: robotId, name: 'owned', user_id: userId } as Robot]);

            const actor = createUserActorAsOwner(userId);
            await service.delete(robotId, actor);
            expect(actor.permissionChecker.preCheck).not.toHaveBeenCalled();
        });

        it('should allow owner to delete without permission check', async () => {
            const userId = randomUUID();
            const robotId = randomUUID();
            repository.seed([{ id: robotId, name: 'owned-robot', user_id: userId } as Robot]);

            const actor = createUserActorAsOwner(userId);
            vi.mocked(actor.permissionChecker.check).mockRejectedValue(new ForbiddenError());
            vi.mocked(actor.permissionChecker.preCheck).mockRejectedValue(new ForbiddenError());

            const result = await service.delete(robotId, actor);
            expect(result.id).toBe(robotId);
        });

        it('should require permission check for robots not owned by actor', async () => {
            const robotId = randomUUID();
            repository.seed([{ id: robotId, name: 'unowned-robot', user_id: randomUUID() } as Robot]);

            const actor = createUserActorAsOwner(randomUUID());
            vi.mocked(actor.permissionChecker.check).mockRejectedValue(new ForbiddenError());

            await expect(service.delete(robotId, actor)).rejects.toThrow(ForbiddenError);
        });

        it('should require permission check for robots with no user_id', async () => {
            const robotId = randomUUID();
            repository.seed([{ id: robotId, name: 'system-robot', user_id: null } as Robot]);

            const actor = createUserActorAsOwner(randomUUID());
            vi.mocked(actor.permissionChecker.check).mockRejectedValue(new ForbiddenError());

            await expect(service.delete(robotId, actor)).rejects.toThrow(ForbiddenError);
        });
    });
});
