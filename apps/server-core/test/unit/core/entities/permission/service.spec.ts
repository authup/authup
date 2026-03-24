/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { Permission, PermissionPolicy, Role, RolePermission } from '@authup/core-kit';
import {
    beforeEach, describe, expect, it,
} from 'vitest';
import { SystemPolicyName } from '@authup/access';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionService } from '../../../../../src/core/entities/permission/service.ts';
import type { IPermissionRepository } from '../../../../../src/core/entities/permission/types.ts';
import { FakeEntityRepository, FakePolicyRepository, FakeRealmRepository } from '../../helpers/index.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
    createMasterRealmActor,
    createNonMasterRealmActor,
} from '../../helpers/mock-actor.ts';
import { createFakePermission } from '../../../../utils/domains/index.ts';

class FakePermissionRepository extends FakeEntityRepository<Permission> implements IPermissionRepository {
    async checkUniqueness(): Promise<void> {
        // no-op
    }
}

describe('core/entities/permission/service', () => {
    let repository: FakePermissionRepository;
    let realmRepository: FakeRealmRepository;
    let roleRepository: FakeEntityRepository<Role>;
    let rolePermissionRepository: FakeEntityRepository<RolePermission>;
    let policyRepository: FakePolicyRepository;
    let permissionPolicyRepository: FakeEntityRepository<PermissionPolicy>;
    let service: PermissionService;

    beforeEach(() => {
        repository = new FakePermissionRepository();
        realmRepository = new FakeRealmRepository();
        roleRepository = new FakeEntityRepository<Role>();
        rolePermissionRepository = new FakeEntityRepository<RolePermission>();
        policyRepository = new FakePolicyRepository();
        policyRepository.seed([{
            id: 'default-policy-id',
            name: SystemPolicyName.DEFAULT,
            type: 'composite',
            built_in: true,
            realm_id: null,
        }]);
        permissionPolicyRepository = new FakeEntityRepository<PermissionPolicy>();
        service = new PermissionService({
            repository,
            realmRepository,
            roleRepository,
            rolePermissionRepository,
            policyRepository,
            permissionPolicyRepository,
        });
    });

    describe('getMany', () => {
        it('should return entities when actor has permission', async () => {
            repository.seed([
                createFakePermission(),
            ]);

            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('should call preCheckOneOf with permission permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);

            expect(actor.permissionEvaluator.preEvaluateOneOf).toHaveBeenCalledWith({
                name: [
                    PermissionName.PERMISSION_READ,
                    PermissionName.PERMISSION_UPDATE,
                    PermissionName.PERMISSION_DELETE,
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
            const entity = repository.seed(createFakePermission({ name: 'test-perm' }));

            const result = await service.getOne(entity.id, createAllowAllActor());
            expect(result.name).toBe('test-perm');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.getOne('non-existent-id', createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });
    });

    describe('create', () => {
        it('should create a permission with valid data', async () => {
            const result = await service.create(
                { name: 'new-permission' },
                createAllowAllActor(),
            );

            expect(result.id).toBeDefined();
            expect(result.name).toBe('new-permission');
        });

        it('should call preCheck with PERMISSION_CREATE', async () => {
            const actor = createAllowAllActor();
            await service.create({ name: 'test-perm' }, actor);

            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({
                name: PermissionName.PERMISSION_CREATE,
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({ name: 'test-perm' }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should not assign policy_id when none provided', async () => {
            const result = await service.create(
                { name: 'no-policy-perm' },
                createAllowAllActor(),
            );

            expect(result.policy_id).toBeUndefined();
        });
    });

    describe('update', () => {
        it('should update an existing permission', async () => {
            const entity = repository.seed(createFakePermission({ name: 'old-perm', built_in: false }));

            const result = await service.update(
                entity.id,
                { description: 'updated' },
                createAllowAllActor(),
            );

            expect(result.description).toBe('updated');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { description: 'x' }, createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should prevent renaming a built-in permission', async () => {
            const entity = repository.seed(createFakePermission({ name: 'built-in-perm', built_in: true }));

            await expect(
                service.update(entity.id, { name: 'renamed-perm' }, createAllowAllActor()),
            ).rejects.toThrow(BadRequestError);
        });

        it('should allow updating built-in permission fields other than name', async () => {
            const entity = repository.seed(createFakePermission({ name: 'built-in-perm', built_in: true }));

            const result = await service.update(
                entity.id,
                { description: 'updated description' },
                createAllowAllActor(),
            );

            expect(result.description).toBe('updated description');
        });
    });

    describe('save (upsert)', () => {
        it('should create when entity not found', async () => {
            const { entity, created } = await service.save(
                undefined,
                { name: 'upserted-perm' },
                createAllowAllActor(),
            );

            expect(created).toBe(true);
            expect(entity.name).toBe('upserted-perm');
        });

        it('should update when entity found', async () => {
            const entity = repository.seed(createFakePermission({ name: 'old-perm', built_in: false }));

            const { created } = await service.save(
                entity.id,
                { description: 'updated' },
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

    describe('realm defaulting', () => {
        it('should set realm_id for non-master realm actor on create', async () => {
            const realmId = randomUUID();
            const actor = createNonMasterRealmActor(realmId);

            const result = await service.create({ name: 'realm-perm' }, actor);
            expect(result.realm_id).toBe(realmId);
        });

        it('should set realm_id to master realm for master realm actor on create', async () => {
            const actor = createMasterRealmActor();
            const masterRealmId = actor.identity!.data.realm_id;

            const result = await service.create(
                { name: 'global-perm' },
                actor,
            );

            expect(result.realm_id).toBe(masterRealmId);
        });

        it('should preserve realm_id: null when explicitly provided on create', async () => {
            const actor = createNonMasterRealmActor();

            const result = await service.create(
                { name: 'global-perm', realm_id: null },
                actor,
            );

            expect(result.realm_id).toBeNull();
        });
    });

    describe('delete', () => {
        it('should delete a non-built-in permission', async () => {
            const entity = repository.seed(createFakePermission({ built_in: false }));

            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.delete('non-existent-id', createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should prevent deletion of built-in permissions', async () => {
            const entity = repository.seed(createFakePermission({ built_in: true }));

            await expect(
                service.delete(entity.id, createAllowAllActor()),
            ).rejects.toThrow(BadRequestError);
        });

        it('should call preCheck with PERMISSION_DELETE', async () => {
            const entity = repository.seed(createFakePermission({ built_in: false }));

            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);

            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({
                name: PermissionName.PERMISSION_DELETE,
            });
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed(createFakePermission({ built_in: false }));

            await expect(
                service.delete(entity.id, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });
    });
});
