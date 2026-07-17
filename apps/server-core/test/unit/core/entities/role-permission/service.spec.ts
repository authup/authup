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
import type { Permission, RolePermission } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { RealmScope } from '@authup/access';
import { RolePermissionService } from '../../../../../src/core/entities/role-permission/service.ts';
import {
    FakeEntityRepository,
    createAllowAllActor,
    createDenyAllActor,
    createNonMasterRealmActor,
} from '@authup/server-test-kit';
import { FakeIdentityPermissionProvider } from '../../helpers/index.ts';

describe('core/entities/role-permission/service', () => {
    let repository: FakeEntityRepository<RolePermission>;
    let permissionRepository: FakeEntityRepository<Permission>;
    let service: RolePermissionService;

    beforeEach(() => {
        repository = new FakeEntityRepository<RolePermission>();
        permissionRepository = new FakeEntityRepository<Permission>();
        service = new RolePermissionService({
            repository, 
            permissionRepository, 
            identityPermissionProvider: new FakeIdentityPermissionProvider(), 
        });
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
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toContainEqual({
                name: [
                    PermissionName.ROLE_PERMISSION_DELETE,
                    PermissionName.ROLE_PERMISSION_READ,
                ],
            });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(service.getMany({}, createDenyAllActor())).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });

    describe('getOne', () => {
        it('should return entity by id', async () => {
            const entity = repository.seed({});
            const result = await service.getOne(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.getOne('non-existent-id', createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });
    });

    describe('create', () => {
        it('should create entity and propagate realm ids', async () => {
            const roleRealmId = randomUUID();
            const permissionRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.role = { realmId: roleRealmId };
                data.permission = { realmId: permissionRealmId, name: 'test-perm' };
            });

            const data = {
                roleId: randomUUID(),
                permissionId: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.roleRealmId).toBe(roleRealmId);
            expect(result.permissionRealmId).toBe(permissionRealmId);
        });

        it('should call preCheck with ROLE_PERMISSION_CREATE', async () => {
            const actor = createAllowAllActor();
            await service.create({
                roleId: randomUUID(),
                permissionId: randomUUID(),
            }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROLE_PERMISSION_CREATE });
        });

        it('should preCheck permission name when permission is provided', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.permission = { name: 'custom-perm', realmId: null };
            });

            const actor = createAllowAllActor();
            await service.create({
                roleId: randomUUID(),
                permissionId: randomUUID(),
            }, actor);

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({
                name: 'custom-perm',
                realmId: null,
                clientId: undefined,
            });
        });

        it('should run the permission name preCheck uniformly for the admin role (no bypass)', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.role = { name: ROLE_ADMIN_NAME, realmId: null };
                data.permission = { name: 'custom-perm', realmId: null };
            });

            const actor = createAllowAllActor();
            await service.create({
                roleId: randomUUID(),
                permissionId: randomUUID(),
            }, actor);

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({
                name: 'custom-perm',
                realmId: null,
                clientId: undefined,
            });
        });

        it('caps realmScope to the actor ceiling and ignores explicit policyId for a restricted actor', async () => {
            const provider = new FakeIdentityPermissionProvider();
            provider.setJunctionRealmScope(RealmScope.OWN);
            provider.setJunctionPolicy(undefined);
            const scopedService = new RolePermissionService({
                repository, 
                permissionRepository, 
                identityPermissionProvider: provider, 
            });

            repository.onValidateJoinColumns((data: any) => {
                data.permission = { name: 'custom-perm', realmId: null };
            });

            const result = await scopedService.create({
                roleId: randomUUID(),
                permissionId: randomUUID(),
                realmScope: 'any',
                policyId: randomUUID(),
            }, createNonMasterRealmActor());

            // restricted (own) actor: requested 'any' capped to 'own', explicit policyId ignored.
            expect(result.realmScope).toBe(RealmScope.OWN);
            expect(result.policyId).toBeNull();
        });

        it('lets an any-scoped actor set a broader realmScope', async () => {
            const provider = new FakeIdentityPermissionProvider();
            provider.setJunctionRealmScope(RealmScope.ANY);
            const scopedService = new RolePermissionService({
                repository, 
                permissionRepository, 
                identityPermissionProvider: provider, 
            });

            repository.onValidateJoinColumns((data: any) => {
                data.permission = { name: 'custom-perm', realmId: null };
            });

            const result = await scopedService.create({
                roleId: randomUUID(),
                permissionId: randomUUID(),
                realmScope: 'ownOrNull',
            }, createNonMasterRealmActor());

            expect(result.realmScope).toBe(RealmScope.OWN_OR_NULL);
        });

        it('should throw validation error when roleId is missing', async () => {
            await expect(
                service.create({ permissionId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/roleId/);
        });

        it('should throw validation error when permissionId is missing', async () => {
            await expect(
                service.create({ roleId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/permissionId/);
        });

        it('should throw validation error when roleId is not a valid UUID', async () => {
            await expect(
                service.create({ roleId: 'not-a-uuid', permissionId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/roleId/);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    roleId: randomUUID(),
                    permissionId: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw ConflictError when assignment already exists', async () => {
            const roleId = randomUUID();
            const permissionId = randomUUID();

            repository.seed({ roleId, permissionId });

            await expect(
                service.create({ roleId, permissionId }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_CONFLICT });
        });
    });

    describe('update', () => {
        it('should update policyId on an existing entity', async () => {
            const entity = repository.seed({ policyId: null });
            const policyId = randomUUID();

            const result = await service.update(entity.id, { policyId }, createAllowAllActor());
            expect(result.policyId).toBe(policyId);
        });

        it('should clear policyId when set to null', async () => {
            const policyId = randomUUID();
            const entity = repository.seed({ policyId });

            const result = await service.update(entity.id, { policyId: null }, createAllowAllActor());
            expect(result.policyId).toBeNull();
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { policyId: randomUUID() }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should call preCheck with ROLE_PERMISSION_UPDATE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.update(entity.id, { policyId: null }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROLE_PERMISSION_UPDATE });
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed({});
            await expect(
                service.update(entity.id, { policyId: randomUUID() }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should only update policyId and not other fields', async () => {
            const originalRoleId = randomUUID();
            const entity = repository.seed({ roleId: originalRoleId, policyId: null });
            const policyId = randomUUID();

            const result = await service.update(
                entity.id,
                { policyId, roleId: randomUUID() },
                createAllowAllActor(),
            );
            expect(result.policyId).toBe(policyId);
            expect(result.roleId).toBe(originalRoleId);
        });
    });

    describe('delete', () => {
        it('should delete an existing entity', async () => {
            const entity = repository.seed({});

            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should call preCheck with ROLE_PERMISSION_DELETE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROLE_PERMISSION_DELETE });
        });
    });
});
