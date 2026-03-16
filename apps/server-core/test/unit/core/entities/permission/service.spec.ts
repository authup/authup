/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { Permission } from '@authup/core-kit';
import {
    beforeEach, describe, expect, it,
} from 'vitest';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionService } from '../../../../../src/core/entities/permission/service.ts';
import type { IPermissionRepository } from '../../../../../src/core/entities/permission/types.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import { FakeRealmRepository } from '../../helpers/fake-realm-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
    createMasterRealmActor,
    createNonMasterRealmActor,
} from '../../helpers/mock-actor.ts';

class FakePermissionRepository extends FakeEntityRepository<Permission> implements IPermissionRepository {
    private policyMap: Record<string, { realm_id: string | null }> = {};

    async checkUniqueness(): Promise<void> {
        // no-op
    }

    async saveWithAdminRoleAssignment(entity: Permission): Promise<Permission> {
        return this.save(entity);
    }

    async validateJoinColumns(data: Partial<Permission>): Promise<void> {
        if (data.policy_id && this.policyMap[data.policy_id]) {
            (data as any).policy = this.policyMap[data.policy_id];
        }
    }

    registerPolicy(id: string, realmId: string | null) {
        this.policyMap[id] = { realm_id: realmId };
    }
}

describe('core/entities/permission/service', () => {
    let repository: FakePermissionRepository;
    let realmRepository: FakeRealmRepository;
    let service: PermissionService;

    beforeEach(() => {
        repository = new FakePermissionRepository();
        realmRepository = new FakeRealmRepository();
        service = new PermissionService({ repository, realmRepository });
    });

    describe('getMany', () => {
        it('should return entities when actor has permission', async () => {
            repository.seed([
                { id: randomUUID(), name: 'perm-a' } as Permission,
            ]);

            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('should call preCheckOneOf with permission permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);

            expect(actor.permissionChecker.preCheckOneOf).toHaveBeenCalledWith({
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
            const id = randomUUID();
            repository.seed([{ id, name: 'test-perm' } as Permission]);

            const result = await service.getOne(id, createAllowAllActor());
            expect(result.name).toBe('test-perm');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.getOne(randomUUID(), createAllowAllActor()),
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

            expect(actor.permissionChecker.preCheck).toHaveBeenCalledWith({
                name: PermissionName.PERMISSION_CREATE,
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({ name: 'test-perm' }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should assign default policy_id when provided and no explicit policy_id', async () => {
            const defaultPolicyId = randomUUID();
            const serviceWithDefault = new PermissionService({
                repository,
                realmRepository,
                defaultPolicyId,
            });

            const result = await serviceWithDefault.create(
                { name: 'auto-policy-perm' },
                createAllowAllActor(),
            );

            expect(result.policy_id).toBe(defaultPolicyId);
        });

        it('should not override explicit policy_id with default', async () => {
            const defaultPolicyId = randomUUID();
            const explicitPolicyId = randomUUID();
            const serviceWithDefault = new PermissionService({
                repository,
                realmRepository,
                defaultPolicyId,
            });

            const result = await serviceWithDefault.create(
                { name: 'explicit-policy-perm', policy_id: explicitPolicyId },
                createAllowAllActor(),
            );

            expect(result.policy_id).toBe(explicitPolicyId);
        });

        it('should not assign default policy_id when none configured', async () => {
            const result = await service.create(
                { name: 'no-policy-perm' },
                createAllowAllActor(),
            );

            expect(result.policy_id).toBeUndefined();
        });
    });

    describe('update', () => {
        it('should update an existing permission', async () => {
            const id = randomUUID();
            repository.seed([{
                id, name: 'old-perm', built_in: false,
            } as Permission]);

            const result = await service.update(
                id,
                { description: 'updated' },
                createAllowAllActor(),
            );

            expect(result.description).toBe('updated');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update(randomUUID(), { description: 'x' }, createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should prevent renaming a built-in permission', async () => {
            const id = randomUUID();
            repository.seed([{
                id, name: 'built-in-perm', built_in: true,
            } as Permission]);

            await expect(
                service.update(id, { name: 'renamed-perm' }, createAllowAllActor()),
            ).rejects.toThrow(BadRequestError);
        });

        it('should allow updating built-in permission fields other than name', async () => {
            const id = randomUUID();
            repository.seed([{
                id, name: 'built-in-perm', built_in: true,
            } as Permission]);

            const result = await service.update(
                id,
                { description: 'updated description' },
                createAllowAllActor(),
            );

            expect(result.description).toBe('updated description');
        });
    });

    describe('policy realm mismatch', () => {
        it('should throw on create when policy realm differs from permission realm', async () => {
            const realmIdA = randomUUID();
            const realmIdB = randomUUID();
            const policyId = randomUUID();
            repository.registerPolicy(policyId, realmIdB);

            await expect(
                service.create({
                    name: 'mismatched-perm',
                    realm_id: realmIdA,
                    policy_id: policyId,
                }, createAllowAllActor()),
            ).rejects.toThrow(BadRequestError);
        });

        it('should throw on update when policy realm differs from permission realm', async () => {
            const id = randomUUID();
            const realmIdA = randomUUID();
            const realmIdB = randomUUID();
            const policyId = randomUUID();
            repository.registerPolicy(policyId, realmIdB);
            repository.seed([{
                id, name: 'existing-perm', built_in: false, realm_id: realmIdA,
            } as Permission]);

            await expect(
                service.update(id, {
                    policy_id: policyId,
                }, createAllowAllActor()),
            ).rejects.toThrow(BadRequestError);
        });

        it('should allow matching policy and permission realm', async () => {
            const realmId = randomUUID();
            const policyId = randomUUID();
            repository.registerPolicy(policyId, realmId);

            const result = await service.create({
                name: 'matched-perm',
                realm_id: realmId,
                policy_id: policyId,
            }, createAllowAllActor());

            expect(result.id).toBeDefined();
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
            const id = randomUUID();
            repository.seed([{
                id, name: 'old-perm', built_in: false,
            } as Permission]);

            const { created } = await service.save(
                id,
                { description: 'updated' },
                createAllowAllActor(),
            );

            expect(created).toBe(false);
        });

        it('should throw NotFoundError with updateOnly when entity missing', async () => {
            await expect(
                service.save(randomUUID(), { name: 'test' }, createAllowAllActor(), { updateOnly: true }),
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

        it('should not set realm_id for master realm actor on create', async () => {
            const result = await service.create(
                { name: 'global-perm' },
                createMasterRealmActor(),
            );

            expect(result.realm_id).toBeUndefined();
        });
    });

    describe('delete', () => {
        it('should delete a non-built-in permission', async () => {
            const id = randomUUID();
            repository.seed([{
                id, name: 'deletable', built_in: false,
            } as Permission]);

            const result = await service.delete(id, createAllowAllActor());
            expect(result.id).toBe(id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.delete(randomUUID(), createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should prevent deletion of built-in permissions', async () => {
            const id = randomUUID();
            repository.seed([{
                id, name: 'built-in', built_in: true,
            } as Permission]);

            await expect(
                service.delete(id, createAllowAllActor()),
            ).rejects.toThrow(BadRequestError);
        });

        it('should call preCheck with PERMISSION_DELETE', async () => {
            const id = randomUUID();
            repository.seed([{
                id, name: 'test', built_in: false,
            } as Permission]);

            const actor = createAllowAllActor();
            await service.delete(id, actor);

            expect(actor.permissionChecker.preCheck).toHaveBeenCalledWith({
                name: PermissionName.PERMISSION_DELETE,
            });
        });

        it('should throw when actor lacks permission', async () => {
            const id = randomUUID();
            repository.seed([{
                id, name: 'test', built_in: false,
            } as Permission]);

            await expect(
                service.delete(id, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });
    });
});
