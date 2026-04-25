/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import {
    PermissionName,
    ROLE_ADMIN_NAME,
} from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { RoleService } from '../../../../../src/core/entities/role/service.ts';
import { FakeRealmRepository } from '../../helpers/fake-realm-repository.ts';
import { FakeRoleRepository } from '../../helpers/fake-role-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
    createMasterRealmActor,
    createNonMasterRealmActor,
} from '../../helpers/fake-actor.ts';
import { createFakeRole } from '../../../../utils/domains/index.ts';

describe('core/entities/role/service', () => {
    let repository: FakeRoleRepository;
    let realmRepository: FakeRealmRepository;
    let service: RoleService;

    beforeEach(() => {
        repository = new FakeRoleRepository();
        realmRepository = new FakeRealmRepository();
        service = new RoleService({
            repository,
            realmRepository, 
        });
    });

    describe('getMany', () => {
        it('should return entities when actor has permission', async () => {
            repository.seed([
                createFakeRole(),
                createFakeRole(),
            ]);

            const result = await service.getMany({}, createAllowAllActor());

            expect(result.data).toHaveLength(2);
            expect(result.meta.total).toBe(2);
        });

        it('should call preCheckOneOf with read/update/delete permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);

            expect(actor.permissionEvaluator.preEvaluateOneOf).toHaveBeenCalledWith({
                name: [
                    PermissionName.ROLE_READ,
                    PermissionName.ROLE_UPDATE,
                    PermissionName.ROLE_DELETE,
                ],
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.getMany({}, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const entity = repository.seed(createFakeRole({ name: 'test-role' }));

            const result = await service.getOne(entity.id, createAllowAllActor());

            expect(result.id).toBe(entity.id);
            expect(result.name).toBe('test-role');
        });

        it('should return entity by name', async () => {
            const entity = repository.seed(createFakeRole({ name: 'test-role' }));

            const result = await service.getOne('test-role', createAllowAllActor());

            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.getOne('non-existent-id', createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should throw when actor lacks permission', async () => {
            repository.seed([createFakeRole({ name: 'test-role' })]);

            await expect(
                service.getOne('test-role', createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });
    });

    describe('create', () => {
        it('should create a role with valid data', async () => {
            const result = await service.create(
                { name: 'new-role' },
                createAllowAllActor(),
            );

            expect(result.id).toBeDefined();
            expect(result.name).toBe('new-role');
        });

        it('should call preCheck with ROLE_CREATE permission', async () => {
            const actor = createAllowAllActor();
            await service.create({ name: 'new-role' }, actor);

            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.ROLE_CREATE });
        });

        it('should call check with ROLE_CREATE and PolicyData on create', async () => {
            const actor = createAllowAllActor();
            await service.create({ name: 'policy-role' }, actor);

            expect(actor.permissionEvaluator.evaluate).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: PermissionName.ROLE_CREATE,
                    input: expect.anything(),
                }),
            );
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({ name: 'new-role' }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should reject invalid name (too short)', async () => {
            await expect(
                service.create({ name: 'ab' }, createAllowAllActor()),
            ).rejects.toThrow(/name/i);
        });

        it('should persist the entity in the repository', async () => {
            const result = await service.create(
                { name: 'persisted-role' },
                createAllowAllActor(),
            );

            const found = await repository.findOneById(result.id);
            expect(found).not.toBeNull();
            expect(found!.name).toBe('persisted-role');
        });
    });

    describe('update', () => {
        it('should update an existing role', async () => {
            const entity = repository.seed(createFakeRole({ name: 'old-name' }));

            const result = await service.update(entity.id, { name: 'new-name' }, createAllowAllActor());

            expect(result.id).toBe(entity.id);
            expect(result.name).toBe('new-name');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { name: 'new-name' }, createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should call preCheck with ROLE_UPDATE permission', async () => {
            const entity = repository.seed(createFakeRole({ name: 'old-name' }));

            const actor = createAllowAllActor();
            await service.update(entity.id, { name: 'new-name' }, actor);

            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.ROLE_UPDATE });
        });
    });

    describe('save (upsert)', () => {
        it('should create when entity not found', async () => {
            const {
                entity, 
                created, 
            } = await service.save(
                undefined,
                { name: 'upserted-role' },
                createAllowAllActor(),
            );

            expect(created).toBe(true);
            expect(entity.name).toBe('upserted-role');
        });

        it('should update when entity found by id', async () => {
            const seeded = repository.seed(createFakeRole({ name: 'old-name' }));

            const {
                entity, 
                created, 
            } = await service.save(
                seeded.id,
                { name: 'updated-name' },
                createAllowAllActor(),
            );

            expect(created).toBe(false);
            expect(entity.name).toBe('updated-name');
        });

        it('should update when entity found by name', async () => {
            repository.seed([createFakeRole({ name: 'find-by-name' })]);

            const {
                entity, 
                created, 
            } = await service.save(
                'find-by-name',
                { description: 'updated' },
                createAllowAllActor(),
            );

            expect(created).toBe(false);
            expect(entity.description).toBe('updated');
        });

        it('should throw NotFoundError with updateOnly when entity missing', async () => {
            await expect(
                service.save('non-existent-id', { name: 'test' }, createAllowAllActor(), { updateOnly: true }),
            ).rejects.toThrow(NotFoundError);
        });

        it('should throw NotFoundError with updateOnly and no idOrName', async () => {
            await expect(
                service.save(undefined, { name: 'test' }, createAllowAllActor(), { updateOnly: true }),
            ).rejects.toThrow(NotFoundError);
        });
    });

    describe('realm defaulting', () => {
        it('should set realm_id for non-master realm actor on create', async () => {
            const realmId = randomUUID();
            const actor = createNonMasterRealmActor(realmId);

            const result = await service.create({ name: 'realm-role' }, actor);

            expect(result.realm_id).toBe(realmId);
        });

        it('should set realm_id to master realm for master realm actor on create', async () => {
            const actor = createMasterRealmActor();
            const masterRealmId = actor.identity!.data.realm_id;

            const result = await service.create({ name: 'global-role' }, actor);

            expect(result.realm_id).toBe(masterRealmId);
        });

        it('should not override explicit realm_id', async () => {
            const explicitRealmId = randomUUID();
            const realm = {
                id: explicitRealmId,
                name: 'explicit-realm',
                display_name: null,
                description: null,
                built_in: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            realmRepository.seed([realm]);

            const actor = createNonMasterRealmActor();

            const result = await service.create(
                {
                    name: 'explicit-realm-role',
                    realm_id: explicitRealmId, 
                },
                actor,
            );

            expect(result.realm_id).toBe(explicitRealmId);
        });

        it('should preserve realm_id: null when explicitly provided on create', async () => {
            const actor = createNonMasterRealmActor();

            const result = await service.create(
                {
                    name: 'global-role',
                    realm_id: null, 
                },
                actor,
            );

            expect(result.realm_id).toBeNull();
        });
    });

    describe('delete', () => {
        it('should delete an existing role', async () => {
            const entity = repository.seed(createFakeRole({ name: 'deletable-role' }));

            const result = await service.delete(entity.id, createAllowAllActor());

            expect(result.id).toBe(entity.id);

            const found = await repository.findOneById(entity.id);
            expect(found).toBeNull();
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.delete('non-existent-id', createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed(createFakeRole());

            await expect(
                service.delete(entity.id, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should call preCheck with ROLE_DELETE permission', async () => {
            const entity = repository.seed(createFakeRole());

            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);

            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.ROLE_DELETE });
        });

        it('should prevent deletion of the admin role', async () => {
            const entity = repository.seed(createFakeRole({ name: ROLE_ADMIN_NAME }));

            await expect(
                service.delete(entity.id, createAllowAllActor()),
            ).rejects.toThrow(BadRequestError);
        });

        it('should preserve entity id after removal', async () => {
            const entity = repository.seed(createFakeRole());

            const result = await service.delete(entity.id, createAllowAllActor());

            expect(result.id).toBe(entity.id);
        });
    });
});
