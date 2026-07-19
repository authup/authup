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
import type { Realm, User, UserAttribute } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { BuiltInPolicyType, PermissionError } from '@authup/access';
import { UserAttributeService } from '../../../../../src/core/entities/user-attribute/service.ts';
import { 
    FakeEntityRepository, 
    FakePermissionEvaluator, 
    createAllowAllActor, 
    createDenyAllActor,  
} from '@authup/server-test-kit';
import type { FakeActorContext } from '@authup/server-test-kit';
import { createFakeUserAttribute } from '../../../../utils/domains/index.ts';

function createUserActor(userId: string, realmId?: string): FakeActorContext {
    const rId = realmId || randomUUID();
    return {
        permissionEvaluator: new FakePermissionEvaluator(),
        identity: {
            type: IdentityType.USER,
            data: {
                id: userId,
                realmId: rId,
                realm: {
                    id: rId,
                    name: 'test-realm',
                } as Realm,
            } as User,
        },
    };
}

describe('core/entities/user-attribute/service', () => {
    let repository: FakeEntityRepository<UserAttribute>;
    let service: UserAttributeService;

    beforeEach(() => {
        repository = new FakeEntityRepository<UserAttribute>();
        service = new UserAttributeService({ repository });
    });

    describe('getMany', () => {
        it('should return entities when actor has permission', async () => {
            repository.seed([
                createFakeUserAttribute({ userId: randomUUID() }),
            ]);
            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('should filter out entities that fail canManageUserAttribute', async () => {
            const userId = randomUUID();
            const otherId = randomUUID();

            repository.seed([
                createFakeUserAttribute({
                    name: 'mine',
                    userId, 
                }),
                createFakeUserAttribute({
                    name: 'other',
                    userId: otherId, 
                }),
            ]);

            const actor = createUserActor(userId);
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'evaluate' && call.ctx.name === PermissionName.USER_UPDATE) {
                    throw PermissionError.denied('test');
                }
            });

            const result = await service.getMany({}, actor);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].name).toBe('mine');
            expect(result.meta.total).toBe(1);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });

    describe('getOne', () => {
        it('should return entity when actor can manage', async () => {
            const entity = repository.seed(createFakeUserAttribute({ userId: randomUUID() }));
            const result = await service.getOne(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw ForbiddenError when actor cannot manage', async () => {
            const entity = repository.seed(createFakeUserAttribute({ userId: randomUUID() }));

            const actor = createUserActor(randomUUID());
            actor.permissionEvaluator.deny('evaluate');

            await expect(service.getOne(entity.id, actor)).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.getOne('non-existent-id', createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });
    });

    describe('create', () => {
        it('should create entity with user from join data', async () => {
            const userRealmId = randomUUID();
            const userId = randomUUID();
            const data = {
                name: 'new-attr',
                value: 'val',
                userId,
                user: { realmId: userRealmId },
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.realmId).toBe(userRealmId);
        });

        it('should default userId from actor identity when no user provided', async () => {
            const userId = randomUUID();
            const realmId = randomUUID();
            const actor = createUserActor(userId, realmId);

            const result = await service.create({
                name: 'attr',
                value: 'val', 
            }, actor);
            expect(result.userId).toBe(userId);
            expect(result.realmId).toBe(realmId);
        });

        it('should throw BadRequestError when no userId and no user identity', async () => {
            const actor = createAllowAllActor();
            actor.identity = undefined;

            await expect(
                service.create({
                    name: 'attr',
                    value: 'val', 
                }, actor),
            ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    name: 'attr',
                    value: 'val',
                }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should evaluate USER_SELF_MANAGE with key-value mapping when actor lacks USER_UPDATE on self-create', async () => {
            const userId = randomUUID();
            const realmId = randomUUID();
            const actor = createUserActor(userId, realmId);
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.ctx.name === PermissionName.USER_UPDATE) {
                    throw PermissionError.denied('test');
                }
            });

            await service.create({
                name: 'theme',
                value: 'dark',
                userId,
            }, actor);

            const selfManageCalls = actor.permissionEvaluator.evaluateCalls.filter(
                (c) => c.name === PermissionName.USER_SELF_MANAGE,
            );
            expect(selfManageCalls).toHaveLength(1);
            const attributes = selfManageCalls[0].data?.get('attributes');
            expect(attributes).toEqual({ theme: 'dark' });
        });

        it('should treat data.user.id as target user for self-create detection', async () => {
            const userId = randomUUID();
            const realmId = randomUUID();
            const actor = createUserActor(userId, realmId);
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.ctx.name === PermissionName.USER_UPDATE) {
                    throw PermissionError.denied('test');
                }
            });

            await service.create({
                name: 'theme',
                value: 'dark',
                user: {
                    id: userId,
                    realmId,
                },
            }, actor);

            const selfManageCalls = actor.permissionEvaluator.evaluateCalls.filter(
                (c) => c.name === PermissionName.USER_SELF_MANAGE,
            );
            expect(selfManageCalls).toHaveLength(1);
            const attributes = selfManageCalls[0].data?.get('attributes');
            expect(attributes).toEqual({ theme: 'dark' });
        });

        it('should evaluate USER_UPDATE for non-self-create even with user identity', async () => {
            const userId = randomUUID();
            const otherUserId = randomUUID();
            const realmId = randomUUID();
            const actor = createUserActor(userId, realmId);

            await service.create({
                name: 'theme',
                value: 'dark',
                userId: otherUserId,
                user: { realmId },
            }, actor);

            const updateCalls = actor.permissionEvaluator.evaluateCalls.filter(
                (c) => c.name === PermissionName.USER_UPDATE,
            );
            expect(updateCalls).toHaveLength(1);

            const selfManageCalls = actor.permissionEvaluator.evaluateCalls.filter(
                (c) => c.name === PermissionName.USER_SELF_MANAGE,
            );
            expect(selfManageCalls).toHaveLength(0);
        });

        it('should reject creating user-attribute with name colliding with User column', async () => {
            const reservedNames = new Set(['email', 'password', 'firstName']);
            const localService = new UserAttributeService({
                repository,
                reservedNames,
            });

            await expect(
                localService.create({
                    name: 'email',
                    value: 'foo@bar.com',
                }, createAllowAllActor()),
            ).rejects.toThrow(/collides with a User entity column/);
        });
    });

    describe('update', () => {
        it('should update an existing attribute', async () => {
            const entity = repository.seed(createFakeUserAttribute({
                name: 'old',
                value: 'old-val',
                userId: randomUUID(),
            }));

            const result = await service.update(entity.id, { value: 'new-val' }, createAllowAllActor());
            expect(result.value).toBe('new-val');
        });

        it('should preEvaluate USER_UPDATE to gate access', async () => {
            const entity = repository.seed(createFakeUserAttribute({
                value: 'val',
                userId: randomUUID(),
            }));

            const actor = createAllowAllActor();
            await service.update(entity.id, { value: 'new' }, actor);

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.USER_UPDATE });
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { value: 'x' }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should throw ForbiddenError when actor cannot manage', async () => {
            const entity = repository.seed(createFakeUserAttribute({
                value: 'val',
                userId: randomUUID(),
            }));

            const actor = createUserActor(randomUUID());
            actor.permissionEvaluator.deny('evaluate');

            await expect(service.update(entity.id, { value: 'new' }, actor)).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('ignores a caller-supplied realmId (no USER_UPDATE gate bypass)', async () => {
            const entity = repository.seed(createFakeUserAttribute({
                value: 'val',
                userId: randomUUID(),
                realmId: 'realm-b',
            } as Partial<UserAttribute>));
            const actor = createAllowAllActor();
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'evaluate' && call.ctx.name === PermissionName.USER_UPDATE) {
                    const realm = call.ctx.data?.has(BuiltInPolicyType.REALM_MATCH) ?
                        call.ctx.data.get(BuiltInPolicyType.REALM_MATCH) :
                        undefined;
                    if (typeof realm !== 'undefined' && realm !== 'realm-a') {
                        throw PermissionError.denied('realm');
                    }
                }
            });

            // The actor supplies their own realm to gate the write against it; it must be
            // ignored, so USER_UPDATE still evaluates against the user realm (realm-b).
            await expect(
                service.update(entity.id, { value: 'x', realmId: 'realm-a' }, actor),
            ).rejects.toBeInstanceOf(PermissionError);
        });

        it('treats the owner user as immutable on self-manage (cannot reassign to another user)', async () => {
            const ownerId = randomUUID();
            const entity = repository.seed(createFakeUserAttribute({ userId: ownerId, value: 'v' }));
            // the owner, forced onto the self-manage path (lacks USER_UPDATE)
            const actor = createUserActor(ownerId);
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.ctx.name === PermissionName.USER_UPDATE) {
                    throw PermissionError.denied('no user_update');
                }
            });

            const result = await service.update(entity.id, { value: 'x', userId: randomUUID() }, actor);
            expect(result.userId).toBe(ownerId);
        });
    });

    describe('delete', () => {
        it('should delete an existing attribute', async () => {
            const entity = repository.seed(createFakeUserAttribute({ userId: randomUUID() }));

            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should allow self-manage for own attributes', async () => {
            const userId = randomUUID();
            const entity = repository.seed(createFakeUserAttribute({
                name: 'my-attr',
                userId, 
            }));

            const actor = createUserActor(userId);
            const result = await service.delete(entity.id, actor);
            expect(result.id).toBe(entity.id);
        });

        it('should throw ForbiddenError when actor cannot manage others attributes', async () => {
            const entity = repository.seed(createFakeUserAttribute({ userId: randomUUID() }));

            const actor = createUserActor(randomUUID());
            actor.permissionEvaluator.deny('evaluate');

            await expect(service.delete(entity.id, actor)).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });
});
