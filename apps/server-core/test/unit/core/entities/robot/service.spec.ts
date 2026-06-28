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
    User,
} from '@authup/core-kit';
import { BuiltInPolicyType, PermissionError } from '@authup/access';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { RobotService } from '../../../../../src/core/entities/robot/service.ts';
import {
    FakePermissionEvaluator,
    createAllowAllActor,
    createDenyAllActor,
    createNonMasterRealmActor,
} from '@authup/server-test-kit';
import type { FakeActorContext } from '@authup/server-test-kit';
import { FakeRealmRepository } from '../realm/fake-repository.ts';
import { FakeRobotRepository } from './fake-repository.ts';
import { createFakeRobot } from '../../../../utils/domains/index.ts';

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
            await expect(service.getMany({}, createDenyAllActor())).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
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
            await expect(service.getOne('non-existent-id', createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
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

        it('should bypass permission when self-by-name resolves to actor\'s own record', async () => {
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
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toHaveLength(0);
        });

        it('should require permission when self-by-name resolves to a different entity', async () => {
            const otherEntity = repository.seed(createFakeRobot({ name: 'shared-name' }));
            const actor: FakeActorContext = {
                permissionEvaluator: new FakePermissionEvaluator(),
                identity: {
                    type: IdentityType.ROBOT,
                    data: { id: randomUUID(), name: 'shared-name' } as any,
                },
            };
            actor.permissionEvaluator.deny('preEvaluateOneOf');

            await expect(service.getOne('shared-name', actor)).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
            expect(otherEntity.name).toBe('shared-name');
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

            await expect(service.getOne(target.id, actor)).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
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
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
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
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
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
                    throw PermissionError.denied('test');
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
                    throw PermissionError.denied('test');
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
                    throw PermissionError.denied('test');
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
                    throw PermissionError.denied('test');
                }
            });

            await expect(
                service.update(entity.id, { display_name: 'forbidden' }, actor),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw when actor lacks both ROBOT_UPDATE and ROBOT_SELF_MANAGE', async () => {
            const entity = repository.seed(createFakeRobot({ name: 'self-robot' }));

            const actor = buildSelfActor(entity.id);
            actor.permissionEvaluator.denyAll();

            await expect(
                service.update(entity.id, { display_name: 'forbidden' }, actor),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });

    describe('delete', () => {
        it('should delete an existing robot', async () => {
            const entity = repository.seed(createFakeRobot());
            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
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
                    throw PermissionError.denied('test');
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
                    throw PermissionError.denied('test');
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

            await expect(service.delete(entity.id, actor)).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should require permission check for robots not owned by actor', async () => {
            const entity = repository.seed(createFakeRobot({ user_id: randomUUID() }));

            const actor = createUserActorAsOwner(randomUUID());
            actor.permissionEvaluator.deny('evaluate');

            await expect(service.delete(entity.id, actor)).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should require permission check for robots with no user_id', async () => {
            const entity = repository.seed(createFakeRobot({ user_id: null }));

            const actor = createUserActorAsOwner(randomUUID());
            actor.permissionEvaluator.deny('evaluate');

            await expect(service.delete(entity.id, actor)).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });
});
