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
import type { Realm, User } from '@authup/core-kit';
import {
    beforeEach, describe, expect, it, vi,
} from 'vitest';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { UserService } from '../../../../../src/core/entities/user/service.ts';
import type { IUserRepository } from '../../../../../src/core/entities/user/types.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import { FakeRealmRepository } from '../../helpers/fake-realm-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
    createNonMasterRealmActor,
} from '../../helpers/mock-actor.ts';
import type { ActorContext } from '../../../../../src/core/entities/actor/types.ts';
import { createFakeUser } from '../../../../utils/domains/index.ts';

class FakeUserRepository extends FakeEntityRepository<User> implements IUserRepository {
    async checkUniqueness(): Promise<void> {
        // no-op
    }

    async findOne(id: string, _query?: Record<string, any>, _realm?: string): Promise<User | null> {
        return this.findOneByIdOrName(id, _realm);
    }

    async findOneByWithEmail(where: Record<string, any>): Promise<User | null> {
        return this.findOneBy(where);
    }
}

function createSelfActor(userId: string, userName?: string, realmId?: string): ActorContext {
    const rId = realmId || randomUUID();
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
                name: userName || 'self-user',
                realm_id: rId,
                realm: { id: rId, name: 'test-realm' } as Realm,
            } as User,
        },
    };
}

describe('core/entities/user/service', () => {
    let repository: FakeUserRepository;
    let realmRepository: FakeRealmRepository;
    let service: UserService;

    beforeEach(() => {
        repository = new FakeUserRepository();
        realmRepository = new FakeRealmRepository();
        service = new UserService({ repository, realmRepository });
    });

    describe('getMany', () => {
        it('should return entities when actor has permission', async () => {
            repository.seed([createFakeUser()]);
            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('should call preCheckOneOf with read/update/delete permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOf).toHaveBeenCalledWith({
                name: [
                    PermissionName.USER_READ,
                    PermissionName.USER_UPDATE,
                    PermissionName.USER_DELETE,
                ],
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toThrow(ForbiddenError);
        });

        it('should always include self in results without per-record check', async () => {
            const [selfUser] = repository.seed([
                createFakeUser({ name: 'self' }),
                createFakeUser({ name: 'other' }),
            ]);

            const actor = createSelfActor(selfUser.id);
            vi.mocked(actor.permissionEvaluator.evaluateOneOf).mockRejectedValue(new ForbiddenError());

            const result = await service.getMany({}, actor);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].id).toBe(selfUser.id);
        });

        it('should filter out other users on per-record permission failure', async () => {
            repository.seed([createFakeUser({ name: 'other' })]);

            const actor = createSelfActor(randomUUID());
            vi.mocked(actor.permissionEvaluator.evaluateOneOf).mockRejectedValue(new ForbiddenError());

            const result = await service.getMany({}, actor);
            expect(result.data).toHaveLength(0);
            expect(result.meta.total).toBe(0);
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const entity = repository.seed(createFakeUser({ name: 'test-user' }));
            const result = await service.getOne(entity.id, createAllowAllActor());
            expect(result.name).toBe('test-user');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.getOne('non-existent-id', createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should allow self-access by id without permission check', async () => {
            const entity = repository.seed(createFakeUser({ name: 'self-user' }));

            const actor = createSelfActor(entity.id);
            vi.mocked(actor.permissionEvaluator.preEvaluateOneOf).mockRejectedValue(new ForbiddenError());

            const result = await service.getOne(entity.id, actor);
            expect(result.id).toBe(entity.id);
            expect(actor.permissionEvaluator.preEvaluateOneOf).not.toHaveBeenCalled();
        });

        it('should allow self-access by name without permission check', async () => {
            const userName = 'self-user';
            const entity = repository.seed(createFakeUser({ name: userName }));

            const actor = createSelfActor(entity.id, userName);
            vi.mocked(actor.permissionEvaluator.preEvaluateOneOf).mockRejectedValue(new ForbiddenError());

            const result = await service.getOne(userName, actor);
            expect(result.id).toBe(entity.id);
        });

        it('should require permission for non-self access', async () => {
            const entity = repository.seed(createFakeUser({ name: 'other-user' }));

            await expect(
                service.getOne(entity.id, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });
    });

    describe('create', () => {
        it('should create a user with valid data', async () => {
            const result = await service.create(
                { name: 'new-user', email: 'new@example.com', password: 'securepass123' },
                createAllowAllActor(),
            );

            expect(result.id).toBeDefined();
            expect(result.name).toBe('new-user');
        });

        it('should hash password on create', async () => {
            const result = await service.create(
                { name: 'hashed-user', email: 'hashed@example.com', password: 'plaintext123' },
                createAllowAllActor(),
            );

            expect(result.password).not.toBe('plaintext123');
            expect(result.password).toMatch(/^\$2[aby]\$/);
        });

        it('should call preCheck with USER_CREATE', async () => {
            const actor = createAllowAllActor();
            await service.create({ name: 'test-user', email: 'test@example.com' }, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({
                name: PermissionName.USER_CREATE,
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({ name: 'test-user', email: 'test@example.com' }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should set realm_id from actor for non-master realm', async () => {
            const realmId = randomUUID();
            const actor = createNonMasterRealmActor(realmId);

            const result = await service.create({ name: 'realm-user', email: 'realm@example.com' }, actor);
            expect(result.realm_id).toBe(realmId);
        });
    });

    describe('update', () => {
        it('should update an existing user', async () => {
            const entity = repository.seed(createFakeUser({ name: 'old-name' }));

            const result = await service.update(entity.id, { display_name: 'New Display' }, createAllowAllActor());
            expect(result.display_name).toBe('New Display');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { display_name: 'x' }, createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should hash password on update', async () => {
            const entity = repository.seed(createFakeUser());

            const result = await service.update(entity.id, { password: 'new-pass-123' }, createAllowAllActor());
            expect(result.password).toMatch(/^\$2[aby]\$/);
        });
    });

    describe('self-edit fallback', () => {
        it('should allow self-edit without USER_UPDATE permission', async () => {
            const entity = repository.seed(createFakeUser({ name: 'self-user' }));

            const actor = createSelfActor(entity.id);
            vi.mocked(actor.permissionEvaluator.preEvaluate).mockRejectedValue(new ForbiddenError());

            const result = await service.update(entity.id, { display_name: 'Updated' }, actor);
            expect(result.display_name).toBe('Updated');
        });

        it('should strip restricted fields on self-edit without USER_UPDATE', async () => {
            const entity = repository.seed(createFakeUser({
                name: 'self-user',
                active: true,
                status: null,
                status_message: null,
                name_locked: false,
            }));

            const actor = createSelfActor(entity.id);
            vi.mocked(actor.permissionEvaluator.preEvaluate).mockRejectedValue(new ForbiddenError());

            const result = await service.update(entity.id, {
                display_name: 'Updated',
                active: false,
                status: 'banned',
                status_message: 'test',
                name_locked: true,
            }, actor);

            expect(result.display_name).toBe('Updated');
            expect(result.active).toBe(true);
            expect(result.status).toBeNull();
            expect(result.status_message).toBeNull();
            expect(result.name_locked).toBe(false);
        });

        it('should throw when non-self user lacks USER_UPDATE', async () => {
            const entity = repository.seed(createFakeUser({ name: 'other-user' }));

            const actor = createSelfActor(randomUUID());
            vi.mocked(actor.permissionEvaluator.preEvaluate).mockRejectedValue(new ForbiddenError());

            await expect(
                service.update(entity.id, { display_name: 'x' }, actor),
            ).rejects.toThrow(ForbiddenError);
        });
    });

    describe('name-lock protection', () => {
        it('should prevent name change when name_locked is true and not unlocked', async () => {
            const entity = repository.seed(createFakeUser({ name: 'locked-name', name_locked: true }));

            const result = await service.update(
                entity.id,
                { name: 'new-name' },
                createAllowAllActor(),
            );

            expect(result.name).toBe('locked-name');
        });

        it('should allow name change when name_locked is explicitly set to false', async () => {
            const entity = repository.seed(createFakeUser({ name: 'locked-name', name_locked: true }));

            const result = await service.update(
                entity.id,
                { name: 'new-name', name_locked: false },
                createAllowAllActor(),
            );

            expect(result.name).toBe('new-name');
            expect(result.name_locked).toBe(false);
        });

        it('should prevent name change when re-locking with name_locked: true', async () => {
            const entity = repository.seed(createFakeUser({ name: 'locked-name', name_locked: true }));

            const result = await service.update(
                entity.id,
                { name: 'new-name', name_locked: true },
                createAllowAllActor(),
            );

            expect(result.name).toBe('locked-name');
        });

        it('should allow name change when name was not locked', async () => {
            const entity = repository.seed(createFakeUser({ name: 'old-name', name_locked: false }));

            const result = await service.update(
                entity.id,
                { name: 'new-name' },
                createAllowAllActor(),
            );

            expect(result.name).toBe('new-name');
        });
    });

    describe('delete', () => {
        it('should delete an existing user', async () => {
            const entity = repository.seed(createFakeUser());
            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.delete('non-existent-id', createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should prevent self-deletion', async () => {
            const entity = repository.seed(createFakeUser({ name: 'self-user' }));

            const actor = createSelfActor(entity.id);

            await expect(
                service.delete(entity.id, actor),
            ).rejects.toThrow(BadRequestError);
        });

        it('should call preCheck with USER_DELETE', async () => {
            const entity = repository.seed(createFakeUser());
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({
                name: PermissionName.USER_DELETE,
            });
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed(createFakeUser());
            await expect(service.delete(entity.id, createDenyAllActor())).rejects.toThrow(ForbiddenError);
        });
    });

    describe('save (upsert)', () => {
        it('should create when entity not found', async () => {
            const { entity, created } = await service.save(
                undefined,
                { name: 'upserted-user', email: 'upsert@example.com' },
                createAllowAllActor(),
            );

            expect(created).toBe(true);
            expect(entity.name).toBe('upserted-user');
        });

        it('should update when entity found', async () => {
            const entity = repository.seed(createFakeUser());

            const { created } = await service.save(
                entity.id,
                { display_name: 'updated' },
                createAllowAllActor(),
            );

            expect(created).toBe(false);
        });

        it('should throw NotFoundError with updateOnly when entity missing', async () => {
            await expect(
                service.save('non-existent-id', { name: 'test' }, createAllowAllActor(), { updateOnly: true }),
            ).rejects.toThrow(NotFoundError);
        });
    });
});
