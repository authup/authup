/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { UserRole } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { UserRoleService } from '../../../../../src/core/entities/user-role/service.ts';
import { 
    FakeEntityRepository, 
    createAllowAllActor, 
    createDenyAllActor, 
    createMasterRealmActor, 
} from '@authup/server-test-kit';
import { FakeIdentityPermissionProvider } from '../../helpers/fake-identity-permission-provider.ts';

describe('core/entities/user-role/service', () => {
    let repository: FakeEntityRepository<UserRole>;
    let service: UserRoleService;

    let identityPermissionProvider: FakeIdentityPermissionProvider;

    beforeEach(() => {
        repository = new FakeEntityRepository<UserRole>();
        identityPermissionProvider = new FakeIdentityPermissionProvider();
        service = new UserRoleService({ repository, identityPermissionProvider });
    });

    describe('getMany', () => {
        it('should call preCheckOneOf with correct permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toContainEqual({
                name: [
                    PermissionName.USER_ROLE_READ,
                    PermissionName.USER_ROLE_CREATE,
                    PermissionName.USER_ROLE_UPDATE,
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
            const userRealmId = randomUUID();
            const roleRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.user = { realmId: userRealmId };
                data.role = { realmId: roleRealmId };
            });

            const data = {
                userId: randomUUID(),
                roleId: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.userRealmId).toBe(userRealmId);
            expect(result.roleRealmId).toBe(roleRealmId);
        });

        it('should call preCheck with USER_ROLE_CREATE', async () => {
            const actor = createAllowAllActor();
            await service.create({
                userId: randomUUID(),
                roleId: randomUUID(), 
            }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.USER_ROLE_CREATE });
        });

        it('should throw validation error when userId is missing', async () => {
            await expect(
                service.create({ roleId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/userId/);
        });

        it('should throw validation error when roleId is missing', async () => {
            await expect(
                service.create({ userId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/roleId/);
        });

        it('should throw validation error when userId is not a valid UUID', async () => {
            await expect(
                service.create({ userId: 'not-a-uuid', roleId: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/userId/);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    userId: randomUUID(),
                    roleId: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw ForbiddenError when actor does not own role permissions (superset check)', async () => {
            const identityPermissionProviderDeny = new FakeIdentityPermissionProvider();
            identityPermissionProviderDeny.setSuperset(false);
            const svc = new UserRoleService({ repository, identityPermissionProvider: identityPermissionProviderDeny });

            repository.onValidateJoinColumns((data: any) => {
                data.role = { realmId: null, clientId: null };
                data.user = { realmId: null };
            });

            await expect(
                svc.create({
                    userId: randomUUID(),
                    roleId: randomUUID(),
                }, createMasterRealmActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw ConflictError when assignment already exists', async () => {
            const roleId = randomUUID();
            const userId = randomUUID();

            repository.seed({ roleId, userId });

            await expect(
                service.create({ roleId, userId }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_CONFLICT });
        });
    });

    describe('delete', () => {
        it('should delete an existing entity', async () => {
            const entity = repository.seed({});
            const result = await service.delete(entity.id, createAllowAllActor());
            expect(result.id).toBe(entity.id);
        });

        it('should call preCheck with USER_ROLE_DELETE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.USER_ROLE_DELETE });
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });
    });
});
