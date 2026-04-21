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
import type { RolePermission } from '@authup/core-kit';
import {
    beforeEach, 
    describe, 
    expect, 
    it,
} from 'vitest';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { RolePermissionService } from '../../../../../src/core/entities/role-permission/service.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
} from '../../helpers/mock-actor.ts';

describe('core/entities/role-permission/service', () => {
    let repository: FakeEntityRepository<RolePermission>;
    let service: RolePermissionService;

    beforeEach(() => {
        repository = new FakeEntityRepository<RolePermission>();
        service = new RolePermissionService({ repository });
    });

    describe('getMany', () => {
        it('should return entities when actor has permission', async () => {
            repository.seed([{}]);
            const result = await service.getMany({}, createAllowAllActor());
            expect(result.data).toHaveLength(1);
        });

        it('should call preCheckOneOf with correct permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOf).toHaveBeenCalledWith({
                name: [
                    PermissionName.ROLE_PERMISSION_DELETE,
                    PermissionName.ROLE_PERMISSION_READ,
                ],
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toThrow(ForbiddenError);
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const entity = repository.seed({});
            const result = await service.getOne(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.getOne('non-existent-id', createAllowAllActor())).rejects.toThrow(NotFoundError);
        });
    });

    describe('create', () => {
        it('should create entity and propagate realm ids', async () => {
            const roleRealmId = randomUUID();
            const permissionRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.role = { realm_id: roleRealmId };
                data.permission = { realm_id: permissionRealmId, name: 'test-perm' };
            });

            const data = {
                role_id: randomUUID(),
                permission_id: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.role_realm_id).toBe(roleRealmId);
            expect(result.permission_realm_id).toBe(permissionRealmId);
        });

        it('should call preCheck with ROLE_PERMISSION_CREATE', async () => {
            const actor = createAllowAllActor();
            await service.create({
                role_id: randomUUID(),
                permission_id: randomUUID(),
            }, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.ROLE_PERMISSION_CREATE });
        });

        it('should preCheck permission name when permission is provided', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.permission = { name: 'custom-perm', realm_id: null };
            });

            const actor = createAllowAllActor();
            await service.create({
                role_id: randomUUID(),
                permission_id: randomUUID(),
            }, actor);

            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({
                name: 'custom-perm',
                realmId: null,
                clientId: undefined,
            });
        });

        it('should skip permission name preCheck for admin role', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.role = { name: ROLE_ADMIN_NAME, realm_id: null };
                data.permission = { name: 'custom-perm', realm_id: null };
            });

            const actor = createAllowAllActor();
            await service.create({
                role_id: randomUUID(),
                permission_id: randomUUID(),
            }, actor);

            expect(actor.permissionEvaluator.preEvaluate).not.toHaveBeenCalledWith({
                name: 'custom-perm',
                realmId: null,
                clientId: undefined,
            });
        });

        it('should throw validation error when role_id is missing', async () => {
            await expect(
                service.create({ permission_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/role_id/);
        });

        it('should throw validation error when permission_id is missing', async () => {
            await expect(
                service.create({ role_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/permission_id/);
        });

        it('should throw validation error when role_id is not a valid UUID', async () => {
            await expect(
                service.create({ role_id: 'not-a-uuid', permission_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/role_id/);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    role_id: randomUUID(),
                    permission_id: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });
    });

    describe('update', () => {
        it('should update policy_id on an existing entity', async () => {
            const entity = repository.seed({ policy_id: null });
            const policyId = randomUUID();

            const result = await service.update(entity.id, { policy_id: policyId }, createAllowAllActor());
            expect(result.policy_id).toBe(policyId);
        });

        it('should clear policy_id when set to null', async () => {
            const policyId = randomUUID();
            const entity = repository.seed({ policy_id: policyId });

            const result = await service.update(entity.id, { policy_id: null }, createAllowAllActor());
            expect(result.policy_id).toBeNull();
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { policy_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(NotFoundError);
        });

        it('should call preCheck with ROLE_PERMISSION_UPDATE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.update(entity.id, { policy_id: null }, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.ROLE_PERMISSION_UPDATE });
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed({});
            await expect(
                service.update(entity.id, { policy_id: randomUUID() }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should only update policy_id and not other fields', async () => {
            const originalRoleId = randomUUID();
            const entity = repository.seed({ role_id: originalRoleId, policy_id: null });
            const policyId = randomUUID();

            const result = await service.update(
                entity.id,
                { policy_id: policyId, role_id: randomUUID() },
                createAllowAllActor(),
            );
            expect(result.policy_id).toBe(policyId);
            expect(result.role_id).toBe(originalRoleId);
        });
    });

    describe('delete', () => {
        it('should delete an existing entity', async () => {
            const entity = repository.seed({});

            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toThrow(NotFoundError);
        });

        it('should call preCheck with ROLE_PERMISSION_DELETE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluate).toHaveBeenCalledWith({ name: PermissionName.ROLE_PERMISSION_DELETE });
        });
    });
});
