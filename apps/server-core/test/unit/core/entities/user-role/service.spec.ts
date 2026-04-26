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
import { ConflictError, ForbiddenError, NotFoundError } from '@ebec/http';
import { UserRoleService } from '../../../../../src/core/entities/user-role/service.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import { FakeIdentityPermissionProvider } from '../../helpers/fake-identity-permission-provider.ts';
import {
    createAllowAllActor,
    createDenyAllActor,
    createMasterRealmActor,
} from '../../helpers/fake-actor.ts';

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
            const userRealmId = randomUUID();
            const roleRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.user = { realm_id: userRealmId };
                data.role = { realm_id: roleRealmId };
            });

            const data = {
                user_id: randomUUID(),
                role_id: randomUUID(),
            };

            const result = await service.create(data, createAllowAllActor());
            expect(result.id).toBeDefined();
            expect(result.user_realm_id).toBe(userRealmId);
            expect(result.role_realm_id).toBe(roleRealmId);
        });

        it('should call preCheck with USER_ROLE_CREATE', async () => {
            const actor = createAllowAllActor();
            await service.create({
                user_id: randomUUID(),
                role_id: randomUUID(), 
            }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.USER_ROLE_CREATE });
        });

        it('should throw validation error when user_id is missing', async () => {
            await expect(
                service.create({ role_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/user_id/);
        });

        it('should throw validation error when role_id is missing', async () => {
            await expect(
                service.create({ user_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/role_id/);
        });

        it('should throw validation error when user_id is not a valid UUID', async () => {
            await expect(
                service.create({ user_id: 'not-a-uuid', role_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/user_id/);
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    user_id: randomUUID(),
                    role_id: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should throw ForbiddenError when actor does not own role permissions (superset check)', async () => {
            const identityPermissionProviderDeny = new FakeIdentityPermissionProvider();
            identityPermissionProviderDeny.setSuperset(false);
            const svc = new UserRoleService({ repository, identityPermissionProvider: identityPermissionProviderDeny });

            repository.onValidateJoinColumns((data: any) => {
                data.role = { realm_id: null, client_id: null };
                data.user = { realm_id: null };
            });

            await expect(
                svc.create({
                    user_id: randomUUID(),
                    role_id: randomUUID(),
                }, createMasterRealmActor()),
            ).rejects.toThrow(ForbiddenError);
        });

        it('should throw ConflictError when assignment already exists', async () => {
            const roleId = randomUUID();
            const userId = randomUUID();

            repository.seed({ role_id: roleId, user_id: userId });

            await expect(
                service.create({ role_id: roleId, user_id: userId }, createAllowAllActor()),
            ).rejects.toThrow(ConflictError);
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
            await expect(service.delete('non-existent-id', createAllowAllActor())).rejects.toThrow(NotFoundError);
        });
    });
});
