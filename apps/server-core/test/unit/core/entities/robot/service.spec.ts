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
    beforeEach, 
    describe, 
    expect, 
    it, 
    vi,
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
import { createFakeRobot } from '../../../../utils/domains/index.ts';

class FakeRobotRepository extends FakeEntityRepository<Robot> implements IRobotRepository {
    async checkUniqueness(): Promise<void> {
        // no-op
    }

    async findOneWithSecret(where: Record<string, any>): Promise<Robot | null> {
        return this.findOneBy(where);
    }

    async getBoundRoles(): Promise<any[]> {
        return [];
    }

    async getBoundPermissions(): Promise<any[]> {
        return [];
    }
}

function createUserActorAsOwner(userId: string): ActorContext {
    const realmId = randomUUID();
    return {
        permissionEvaluator: {
            evaluate: vi.fn().mockResolvedValue(undefined),
            evaluateOneOf: vi.fn().mockResolvedValue(undefined),
            preEvaluate: vi.fn().mockResolvedValue(undefined),
            preEvaluateOneOf: vi.fn().mockResolvedValue(undefined),
        },
        identity: {
            type: IdentityType.USER,
            data: {
                id: userId,
                realm_id: realmId,
                realm: {
                    id: realmId,
                    name: 'test', 
                } as Realm,
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
        service = new RobotService({
            repository,
            realmRepository, 
        });
    });

    describe('getMany', () => {
        it('should return entities when actor has permission', async () => {
            repository.seed([createFakeRobot()]);
            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('should include self-access entities without per-record check', async () => {
            const realmId = randomUUID();

            const [selfRobot] = repository.seed([
                createFakeRobot({ name: 'self-robot' }),
                createFakeRobot({ name: 'other-robot' }),
            ]);

            const actor: ActorContext = {
                permissionEvaluator: {
                    evaluate: vi.fn().mockResolvedValue(undefined),
                    evaluateOneOf: vi.fn().mockResolvedValue(undefined),
                    preEvaluate: vi.fn().mockResolvedValue(undefined),
                    preEvaluateOneOf: vi.fn().mockResolvedValue(undefined),
                },
                identity: {
                    type: IdentityType.ROBOT,
                    data: {
                        id: selfRobot.id,
                        realm_id: realmId,
                        realm: {
                            id: realmId,
                            name: 'test', 
                        } as Realm,
                    } as Robot,
                },
            };

            vi.mocked(actor.permissionEvaluator.evaluateOneOf).mockRejectedValue(new ForbiddenError());

            const result = await service.getMany({}, actor);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].id).toBe(selfRobot.id);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toThrow(ForbiddenError);
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const entity = repository.seed(createFakeRobot({ name: 'test-robot' }));
            const result = await service.getOne(entity.id, createAllowAllActor());
            expect(result.name).toBe('test-robot');
        });

        it('should return entity by name', async () => {
            repository.seed([createFakeRobot({ name: 'my-robot' })]);
            const result = await service.getOne('my-robot', createAllowAllActor());
            expect(result.name).toBe('my-robot');
        });

        it('should call checkOneOf (not check) for per-record permission', async () => {
            const entity = repository.seed(createFakeRobot());
            const actor = createAllowAllActor();
            await service.getOne(entity.id, actor);
            expect(actor.permissionEvaluator.evaluateOneOf).toHaveBeenCalled();
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.getOne('non-existent-id', createAllowAllActor())).rejects.toThrow(NotFoundError);
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
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.ROBOT_CREATE });
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
            const entity = repository.seed(createFakeRobot({ name: 'old-name' }));

            const result = await service.update(entity.id, { name: 'new-name' }, createAllowAllActor());
            expect(result.name).toBe('new-name');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { name: 'x' }, createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should return plaintext secret after update with new secret', async () => {
            const entity = repository.seed(createFakeRobot());

            const result = await service.update(entity.id, { secret: 'new-secret-value' }, createAllowAllActor());
            expect(result.secret).toBe('new-secret-value');
        });
    });

    describe('delete', () => {
        it('should delete an existing robot', async () => {
            const entity = repository.seed(createFakeRobot());
            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toThrow(NotFoundError);
        });

        it('should call preCheck with ROBOT_DELETE for non-owner', async () => {
            const entity = repository.seed(createFakeRobot({ user_id: null }));
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.ROBOT_DELETE });
        });

        it('should not call preCheck for owner delete', async () => {
            const userId = randomUUID();
            const entity = repository.seed(createFakeRobot({
                name: 'owned',
                user_id: userId, 
            }));

            const actor = createUserActorAsOwner(userId);
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluate).not.toHaveBeenCalled();
        });

        it('should allow owner to delete without permission check', async () => {
            const userId = randomUUID();
            const entity = repository.seed(createFakeRobot({ user_id: userId }));

            const actor = createUserActorAsOwner(userId);
            vi.mocked(actor.permissionEvaluator.evaluate).mockRejectedValue(new ForbiddenError());
            vi.mocked(actor.permissionEvaluator.preEvaluate).mockRejectedValue(new ForbiddenError());

            const result = await service.delete(entity.id, actor);
            expect(result.id).toBe(entity.id);
        });

        it('should require permission check for robots not owned by actor', async () => {
            const entity = repository.seed(createFakeRobot({ user_id: randomUUID() }));

            const actor = createUserActorAsOwner(randomUUID());
            vi.mocked(actor.permissionEvaluator.evaluate).mockRejectedValue(new ForbiddenError());

            await expect(service.delete(entity.id, actor)).rejects.toThrow(ForbiddenError);
        });

        it('should require permission check for robots with no user_id', async () => {
            const entity = repository.seed(createFakeRobot({ user_id: null }));

            const actor = createUserActorAsOwner(randomUUID());
            vi.mocked(actor.permissionEvaluator.evaluate).mockRejectedValue(new ForbiddenError());

            await expect(service.delete(entity.id, actor)).rejects.toThrow(ForbiddenError);
        });
    });
});
