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
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { UserAttributeService } from '../../../../../src/core/entities/user-attribute/service.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
} from '../../helpers/fake-actor.ts';
import type { FakeActorContext } from '../../helpers/fake-actor.ts';
import { FakePermissionEvaluator } from '../../helpers/fake-permission-evaluator.ts';
import { createFakeUserAttribute } from '../../../../utils/domains/index.ts';

function createUserActor(userId: string, realmId?: string): FakeActorContext {
    const rId = realmId || randomUUID();
    return {
        permissionEvaluator: new FakePermissionEvaluator(),
        identity: {
            type: IdentityType.USER,
            data: {
                id: userId,
                realm_id: rId,
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
                createFakeUserAttribute({ user_id: randomUUID() }),
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
                    user_id: userId, 
                }),
                createFakeUserAttribute({
                    name: 'other',
                    user_id: otherId, 
                }),
            ]);

            const actor = createUserActor(userId);
            actor.permissionEvaluator.setBehavior((call) => {
                if (call.method === 'evaluate' && call.ctx.name === PermissionName.USER_UPDATE) {
                    throw new ForbiddenError();
                }
            });

            const result = await service.getMany({}, actor);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].name).toBe('mine');
            expect(result.meta.total).toBe(1);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toThrow(ForbiddenError);
        });
    });

    describe('getOne', () => {
        it('should return entity when actor can manage', async () => {
            const entity = repository.seed(createFakeUserAttribute({ user_id: randomUUID() }));
            const result = await service.getOne(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw ForbiddenError when actor cannot manage', async () => {
            const entity = repository.seed(createFakeUserAttribute({ user_id: randomUUID() }));

            const actor = createUserActor(randomUUID());
            actor.permissionEvaluator.deny('evaluate');

            await expect(service.getOne(entity.id, actor)).rejects.toThrow(ForbiddenError);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.getOne('non-existent-id', createAllowAllActor())).rejects.toThrow(NotFoundError);
        });
    });

    describe('create', () => {
        it('should create entity with user from join data', async () => {
            const userRealmId = randomUUID();
            const userId = randomUUID();
            const data = {
                name: 'new-attr',
                value: 'val',
                user_id: userId,
                user: { realm_id: userRealmId },
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.realm_id).toBe(userRealmId);
        });

        it('should default user_id from actor identity when no user provided', async () => {
            const userId = randomUUID();
            const realmId = randomUUID();
            const actor = createUserActor(userId, realmId);

            const result = await service.create({
                name: 'attr',
                value: 'val', 
            }, actor);
            expect(result.user_id).toBe(userId);
            expect(result.realm_id).toBe(realmId);
        });

        it('should throw BadRequestError when no user_id and no user identity', async () => {
            const actor = createAllowAllActor();
            actor.identity = undefined;

            await expect(
                service.create({
                    name: 'attr',
                    value: 'val', 
                }, actor),
            ).rejects.toThrow(BadRequestError);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    name: 'attr',
                    value: 'val', 
                }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });
    });

    describe('update', () => {
        it('should update an existing attribute', async () => {
            const entity = repository.seed(createFakeUserAttribute({
                name: 'old',
                value: 'old-val',
                user_id: randomUUID(),
            }));

            const result = await service.update(entity.id, { value: 'new-val' }, createAllowAllActor());
            expect(result.value).toBe('new-val');
        });

        it('should use checkOneOf (not preCheckOneOf) for permission check', async () => {
            const entity = repository.seed(createFakeUserAttribute({
                value: 'val',
                user_id: randomUUID(),
            }));

            const actor = createAllowAllActor();
            await service.update(entity.id, { value: 'new' }, actor);

            expect(actor.permissionEvaluator.evaluateOneOf).toHaveBeenCalledWith({
                name: [
                    PermissionName.USER_UPDATE,
                    PermissionName.USER_SELF_MANAGE,
                ],
            });
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { value: 'x' }, createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should throw ForbiddenError when actor cannot manage', async () => {
            const entity = repository.seed(createFakeUserAttribute({
                value: 'val',
                user_id: randomUUID(),
            }));

            const actor = createUserActor(randomUUID());
            actor.permissionEvaluator.deny('evaluate');

            await expect(service.update(entity.id, { value: 'new' }, actor)).rejects.toThrow(ForbiddenError);
        });
    });

    describe('delete', () => {
        it('should delete an existing attribute', async () => {
            const entity = repository.seed(createFakeUserAttribute({ user_id: randomUUID() }));

            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toThrow(NotFoundError);
        });

        it('should allow self-manage for own attributes', async () => {
            const userId = randomUUID();
            const entity = repository.seed(createFakeUserAttribute({
                name: 'my-attr',
                user_id: userId, 
            }));

            const actor = createUserActor(userId);
            const result = await service.delete(entity.id, actor);
            expect(result.id).toBe(entity.id);
        });

        it('should throw ForbiddenError when actor cannot manage others attributes', async () => {
            const entity = repository.seed(createFakeUserAttribute({ user_id: randomUUID() }));

            const actor = createUserActor(randomUUID());
            actor.permissionEvaluator.deny('evaluate');

            await expect(service.delete(entity.id, actor)).rejects.toThrow(ForbiddenError);
        });
    });
});
