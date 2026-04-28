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
import type { 
    Realm, 
    Robot, 
    Role, 
    User, 
} from '@authup/core-kit';
import { BuiltInPolicyType } from '@authup/access';
import type { PermissionPolicyBinding } from '@authup/access';
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
} from '../../helpers/fake-actor.ts';
import type { FakeActorContext } from '../../helpers/fake-actor.ts';
import { FakePermissionEvaluator } from '../../helpers/fake-permission-evaluator.ts';
import { createFakeRobot } from '../../../../utils/domains/index.ts';

class FakeRobotRepository extends FakeEntityRepository<Robot> implements IRobotRepository {
    async checkUniqueness(): Promise<void> {
        // no-op
    }

    async findOne(id: string, _query?: Record<string, any>, realm?: string): Promise<Robot | null> {
        return this.findOneByIdOrName(id, realm);
    }

    async findOneWithSecret(where: Record<string, any>): Promise<Robot | null> {
        return this.findOneBy(where);
    }

    async getBoundRoles(_entity: string | Robot): Promise<Role[]> {
        return [];
    }

    async getBoundPermissions(_entity: string | Robot): Promise<PermissionPolicyBinding[]> {
        return [];
    }
}

function createUserActorAsOwner(userId: string): FakeActorContext {
    const realmId = randomUUID();
    return {
        permissionEvaluator: new FakePermissionEvaluator(),
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

            const actor: FakeActorContext = {
                permissionEvaluator: new FakePermissionEvaluator(),
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

            actor.permissionEvaluator.deny('evaluateOneOf');

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
            expect(actor.permissionEvaluator.evaluateOneOfCalls.length).toBeGreaterThan(0);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.getOne('non-existent-id', createAllowAllActor())).rejects.toThrow(NotFoundError);
        });

        it('should forward query and realmId to repository.findOne', async () => {
            const entity = repository.seed(createFakeRobot({ name: 'queried-robot' }));
            const findOneSpy = vi.spyOn(repository, 'findOne');

            await service.getOne(entity.id, createAllowAllActor(), { fields: '+secret' });

            expect(findOneSpy).toHaveBeenCalledWith(entity.id, { fields: '+secret' }, undefined);
        });

        it('should bypass the permission gate when actor is the robot itself', async () => {
            const entity = repository.seed(createFakeRobot({ name: 'self-robot' }));
            const actor: FakeActorContext = {
                permissionEvaluator: new FakePermissionEvaluator(),
                identity: {
                    type: IdentityType.ROBOT,
                    data: { id: entity.id, name: 'self-robot' } as any,
                },
            };
            actor.permissionEvaluator.denyAll();

            const result = await service.getOne(entity.id, actor);
            expect(result.id).toBe(entity.id);
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toHaveLength(0);
            expect(actor.permissionEvaluator.preEvaluateCalls).toHaveLength(0);
            expect(actor.permissionEvaluator.evaluateOneOfCalls).toHaveLength(0);
        });

        it('should detect self-access by name lookup', async () => {
            const entity = repository.seed(createFakeRobot({ name: 'self-robot' }));
            const actor: FakeActorContext = {
                permissionEvaluator: new FakePermissionEvaluator(),
                identity: {
                    type: IdentityType.ROBOT,
                    data: { id: entity.id, name: 'self-robot' } as any,
                },
            };
            actor.permissionEvaluator.denyAll();

            const result = await service.getOne('self-robot', actor);
            expect(result.id).toBe(entity.id);
        });

        it('should require permission when robot actor looks at a different robot', async () => {
            const target = repository.seed(createFakeRobot({ name: 'other-robot' }));
            const actor: FakeActorContext = {
                permissionEvaluator: new FakePermissionEvaluator(),
                identity: {
                    type: IdentityType.ROBOT,
                    data: { id: randomUUID(), name: 'self-robot' } as any,
                },
            };
            actor.permissionEvaluator.deny('preEvaluateOneOf');

            await expect(service.getOne(target.id, actor)).rejects.toThrow(ForbiddenError);
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
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROBOT_CREATE });
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

    describe('self-edit fallback', () => {
        const buildSelfActor = (robotId: string): FakeActorContext => {
            const realmId = randomUUID();
            return {
                permissionEvaluator: new FakePermissionEvaluator(),
                identity: {
                    type: IdentityType.ROBOT,
                    data: {
                        id: robotId,
                        realm_id: realmId,
                        realm: {
                            id: realmId,
                            name: 'test',
                        } as Realm,
                    } as Robot,
                },
            };
        };

        it('should allow self-edit without ROBOT_UPDATE when actor is the robot itself', async () => {
            const entity = repository.seed(createFakeRobot({ name: 'self-robot' }));

            const actor = buildSelfActor(entity.id);
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'preEvaluate' && call.ctx.name === PermissionName.ROBOT_UPDATE) {
                    throw new ForbiddenError();
                }
            });

            const result = await service.update(entity.id, { display_name: 'Self Updated' }, actor);
            expect(result.display_name).toBe('Self Updated');

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROBOT_SELF_MANAGE });
            expect(actor.permissionEvaluator.evaluateCalls).toContainEqual(
                expect.objectContaining({ name: PermissionName.ROBOT_SELF_MANAGE }),
            );
        });

        it('should evaluate ROBOT_SELF_MANAGE against the validated input data only', async () => {
            const entity = repository.seed(createFakeRobot({
                name: 'self-robot',
                description: 'old',
            }));

            const actor = buildSelfActor(entity.id);
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'preEvaluate' && call.ctx.name === PermissionName.ROBOT_UPDATE) {
                    throw new ForbiddenError();
                }
            });

            await service.update(entity.id, { description: 'updated-desc' }, actor);

            const selfManageCall = actor.permissionEvaluator.evaluateCalls.find(
                (c) => c.name === PermissionName.ROBOT_SELF_MANAGE,
            );
            expect(selfManageCall).toBeDefined();
            const attrs = selfManageCall!.input!.get<Record<string, any>>(BuiltInPolicyType.ATTRIBUTES);
            expect(attrs).toHaveProperty('description', 'updated-desc');
            expect(attrs).not.toHaveProperty('id');
            expect(attrs).not.toHaveProperty('user_id');
            expect(attrs).not.toHaveProperty('client_id');
        });

        it('should allow self-rotation of secret', async () => {
            const entity = repository.seed(createFakeRobot({ name: 'self-robot' }));

            const actor = buildSelfActor(entity.id);
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'preEvaluate' && call.ctx.name === PermissionName.ROBOT_UPDATE) {
                    throw new ForbiddenError();
                }
            });

            const result = await service.update(entity.id, { secret: 'rotated-secret' }, actor);
            expect(result.secret).toBe('rotated-secret');
        });

        it('should throw when actor lacks ROBOT_UPDATE and is not the robot itself', async () => {
            const entity = repository.seed(createFakeRobot({ name: 'other-robot' }));

            const actor = buildSelfActor(randomUUID());
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'preEvaluate' && call.ctx.name === PermissionName.ROBOT_UPDATE) {
                    throw new ForbiddenError();
                }
            });

            await expect(
                service.update(entity.id, { display_name: 'forbidden' }, actor),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should throw when actor lacks both ROBOT_UPDATE and ROBOT_SELF_MANAGE', async () => {
            const entity = repository.seed(createFakeRobot({ name: 'self-robot' }));

            const actor = buildSelfActor(entity.id);
            actor.permissionEvaluator.denyAll();

            await expect(
                service.update(entity.id, { display_name: 'forbidden' }, actor),
            ).rejects.toThrow(ForbiddenError);
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
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROBOT_DELETE });
        });

        it('should fall back to ROBOT_SELF_MANAGE preCheck when owner lacks ROBOT_DELETE', async () => {
            const userId = randomUUID();
            const entity = repository.seed(createFakeRobot({
                name: 'owned',
                user_id: userId,
            }));

            const actor = createUserActorAsOwner(userId);
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'preEvaluate' && call.ctx.name === PermissionName.ROBOT_DELETE) {
                    throw new ForbiddenError();
                }
            });

            await service.delete(entity.id, actor);

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROBOT_DELETE });
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROBOT_SELF_MANAGE });
        });

        it('should allow owner to delete with ROBOT_SELF_MANAGE when ROBOT_DELETE is denied', async () => {
            const userId = randomUUID();
            const entity = repository.seed(createFakeRobot({ user_id: userId }));

            const actor = createUserActorAsOwner(userId);
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.ctx.name === PermissionName.ROBOT_DELETE) {
                    throw new ForbiddenError();
                }
            });

            const result = await service.delete(entity.id, actor);
            expect(result.id).toBe(entity.id);
        });

        it('should reject owner delete when both ROBOT_DELETE and ROBOT_SELF_MANAGE are denied', async () => {
            const userId = randomUUID();
            const entity = repository.seed(createFakeRobot({ user_id: userId }));

            const actor = createUserActorAsOwner(userId);
            actor.permissionEvaluator.deny('preEvaluate');

            await expect(service.delete(entity.id, actor)).rejects.toThrow(ForbiddenError);
        });

        it('should require permission check for robots not owned by actor', async () => {
            const entity = repository.seed(createFakeRobot({ user_id: randomUUID() }));

            const actor = createUserActorAsOwner(randomUUID());
            actor.permissionEvaluator.deny('evaluate');

            await expect(service.delete(entity.id, actor)).rejects.toThrow(ForbiddenError);
        });

        it('should require permission check for robots with no user_id', async () => {
            const entity = repository.seed(createFakeRobot({ user_id: null }));

            const actor = createUserActorAsOwner(randomUUID());
            actor.permissionEvaluator.deny('evaluate');

            await expect(service.delete(entity.id, actor)).rejects.toThrow(ForbiddenError);
        });
    });
});
