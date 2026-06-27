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
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROLE_PERMISSION_CREATE });
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

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({
                name: 'custom-perm',
                realmId: null,
                clientId: undefined,
            });
        });

        it('should run the permission name preCheck uniformly for the admin role (no bypass)', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.role = { name: ROLE_ADMIN_NAME, realm_id: null };
                data.permission = { name: 'custom-perm', realm_id: null };
            });

            const actor = createAllowAllActor();
            await service.create({
                role_id: randomUUID(),
                permission_id: randomUUID(),
            }, actor);

            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({
                name: 'custom-perm',
                realmId: null,
                clientId: undefined,
            });
        });

        it('caps realm_scope to the actor ceiling and ignores explicit policy_id for a restricted actor', async () => {
            const provider = new FakeIdentityPermissionProvider();
            provider.setJunctionRealmScope(RealmScope.OWN);
            provider.setJunctionPolicy(undefined);
            const scopedService = new RolePermissionService({
                repository, 
                permissionRepository, 
                identityPermissionProvider: provider, 
            });

            repository.onValidateJoinColumns((data: any) => {
                data.permission = { name: 'custom-perm', realm_id: null };
            });

            const result = await scopedService.create({
                role_id: randomUUID(),
                permission_id: randomUUID(),
                realm_scope: 'any',
                policy_id: randomUUID(),
            }, createNonMasterRealmActor());

            // restricted (own) actor: requested 'any' capped to 'own', explicit policy_id ignored.
            expect(result.realm_scope).toBe(RealmScope.OWN);
            expect(result.policy_id).toBeNull();
        });

        it('lets an any-scoped actor set a broader realm_scope', async () => {
            const provider = new FakeIdentityPermissionProvider();
            provider.setJunctionRealmScope(RealmScope.ANY);
            const scopedService = new RolePermissionService({
                repository, 
                permissionRepository, 
                identityPermissionProvider: provider, 
            });

            repository.onValidateJoinColumns((data: any) => {
                data.permission = { name: 'custom-perm', realm_id: null };
            });

            const result = await scopedService.create({
                role_id: randomUUID(),
                permission_id: randomUUID(),
                realm_scope: 'ownOrNull',
            }, createNonMasterRealmActor());

            expect(result.realm_scope).toBe(RealmScope.OWN_OR_NULL);
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
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw ConflictError when assignment already exists', async () => {
            const roleId = randomUUID();
            const permissionId = randomUUID();

            repository.seed({ role_id: roleId, permission_id: permissionId });

            await expect(
                service.create({ role_id: roleId, permission_id: permissionId }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_CONFLICT });
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
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should call preCheck with ROLE_PERMISSION_UPDATE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.update(entity.id, { policy_id: null }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.ROLE_PERMISSION_UPDATE });
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed({});
            await expect(
                service.update(entity.id, { policy_id: randomUUID() }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
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
