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
    beforeEach, describe, expect, it, vi,
} from 'vitest';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { UserAttributeService } from '../../../../../src/core/entities/user-attribute/service.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
} from '../../helpers/mock-actor.ts';
import type { ActorContext } from '../../../../../src/core/entities/actor/types.ts';

function createUserActor(userId: string, realmId?: string): ActorContext {
    const rId = realmId || randomUUID();
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
                realm_id: rId,
                realm: { id: rId, name: 'test-realm' } as Realm,
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
                { id: randomUUID(), name: 'attr', user_id: randomUUID() } as UserAttribute,
            ]);
            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('should filter out entities that fail canManageUserAttribute', async () => {
            const userId = randomUUID();
            const otherId = randomUUID();

            repository.seed([
                { id: randomUUID(), name: 'mine', user_id: userId } as UserAttribute,
                { id: randomUUID(), name: 'other', user_id: otherId } as UserAttribute,
            ]);

            const actor = createUserActor(userId);
            vi.mocked(actor.permissionChecker.check).mockImplementation(async (ctx: any) => {
                if (ctx.name === PermissionName.USER_UPDATE) {
                    throw new ForbiddenError();
                }
            });

            const result = await service.getMany({}, actor);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].name).toBe('mine');
            expect(result.meta.total).toBe(1);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toThrow();
        });
    });

    describe('getOne', () => {
        it('should return entity when actor can manage', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'attr', user_id: randomUUID() } as UserAttribute]);
            const result = await service.getOne(id, createAllowAllActor());
            expect(result.id).toBe(id);
        });

        it('should throw ForbiddenError when actor cannot manage', async () => {
            const id = randomUUID();
            const otherId = randomUUID();
            repository.seed([{ id, name: 'attr', user_id: otherId } as UserAttribute]);

            const actor = createUserActor(randomUUID());
            vi.mocked(actor.permissionChecker.check).mockRejectedValue(new ForbiddenError());

            await expect(service.getOne(id, actor)).rejects.toThrow(ForbiddenError);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.getOne(randomUUID(), createAllowAllActor())).rejects.toThrow(NotFoundError);
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

            const result = await service.create({ name: 'attr', value: 'val' }, actor);
            expect(result.user_id).toBe(userId);
            expect(result.realm_id).toBe(realmId);
        });

        it('should throw BadRequestError when no user_id and no user identity', async () => {
            const actor = createAllowAllActor();
            actor.identity = undefined;

            await expect(
                service.create({ name: 'attr', value: 'val' }, actor),
            ).rejects.toThrow(BadRequestError);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({ name: 'attr', value: 'val' }, createDenyAllActor()),
            ).rejects.toThrow();
        });
    });

    describe('update', () => {
        it('should update an existing attribute', async () => {
            const id = randomUUID();
            repository.seed([{
                id, name: 'old', value: 'old-val', user_id: randomUUID(),
            } as UserAttribute]);

            const result = await service.update(id, { value: 'new-val' }, createAllowAllActor());
            expect(result.value).toBe('new-val');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update(randomUUID(), { value: 'x' }, createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should throw ForbiddenError when actor cannot manage', async () => {
            const id = randomUUID();
            repository.seed([{
                id, name: 'attr', value: 'val', user_id: randomUUID(),
            } as UserAttribute]);

            const actor = createUserActor(randomUUID());
            vi.mocked(actor.permissionChecker.check).mockRejectedValue(new ForbiddenError());
            vi.mocked(actor.permissionChecker.checkOneOf).mockResolvedValue(undefined);

            await expect(service.update(id, { value: 'new' }, actor)).rejects.toThrow(ForbiddenError);
        });
    });

    describe('delete', () => {
        it('should delete an existing attribute', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'del', user_id: randomUUID() } as UserAttribute]);

            const result = await service.delete(id, createAllowAllActor());
            expect(result.id).toBe(id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete(randomUUID(), createAllowAllActor())).rejects.toThrow(NotFoundError);
        });

        it('should allow self-manage for own attributes', async () => {
            const userId = randomUUID();
            const id = randomUUID();
            repository.seed([{ id, name: 'my-attr', user_id: userId } as UserAttribute]);

            const actor = createUserActor(userId);
            const result = await service.delete(id, actor);
            expect(result.id).toBe(id);
        });

        it('should throw ForbiddenError when actor cannot manage others attributes', async () => {
            const id = randomUUID();
            repository.seed([{ id, name: 'other-attr', user_id: randomUUID() } as UserAttribute]);

            const actor = createUserActor(randomUUID());
            vi.mocked(actor.permissionChecker.check).mockRejectedValue(new ForbiddenError());

            await expect(service.delete(id, actor)).rejects.toThrow(ForbiddenError);
        });
    });
});
