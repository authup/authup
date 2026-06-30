/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionName } from '@authup/core-kit';
import type { IdentityProviderRoleMapping, Role } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { IdentityProviderRoleMappingService } from '../../../../../src/core/entities/identity-provider-role-mapping/service.ts';
import { 
    FakeEntityRepository, 
    createAllowAllActor, 
    createDenyAllActor, 
    createMasterRealmActor, 
} from '@authup/server-test-kit';
import { FakeIdentityPermissionProvider } from '../../helpers/fake-identity-permission-provider.ts';

describe('core/entities/identity-provider-role-mapping/service', () => {
    let repository: FakeEntityRepository<IdentityProviderRoleMapping>;
    let roleRepository: FakeEntityRepository<Role>;
    let identityPermissionProvider: FakeIdentityPermissionProvider;
    let service: IdentityProviderRoleMappingService;

    beforeEach(() => {
        repository = new FakeEntityRepository<IdentityProviderRoleMapping>();
        roleRepository = new FakeEntityRepository<Role>();
        identityPermissionProvider = new FakeIdentityPermissionProvider();
        service = new IdentityProviderRoleMappingService({
            repository, 
            roleRepository, 
            identityPermissionProvider, 
        });
    });

    describe('getMany', () => {
        it('should call preEvaluateOneOf with correct permissions', async () => {
            const actor = createAllowAllActor();
            await service.getMany({}, actor);
            expect(actor.permissionEvaluator.preEvaluateOneOfCalls).toContainEqual({
                name: [
                    PermissionName.IDENTITY_PROVIDER_ROLE_READ,
                    PermissionName.IDENTITY_PROVIDER_READ,
                    PermissionName.IDENTITY_PROVIDER_UPDATE,
                    PermissionName.IDENTITY_PROVIDER_DELETE,
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
            const realmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.provider = { realm_id: realmId };
                data.role = { realm_id: realmId, client_id: null };
            });

            const data = {
                provider_id: randomUUID(),
                role_id: randomUUID(),
            };

            const result = await service.create(data, createMasterRealmActor());
            expect(result.id).toBeDefined();
            expect(result.provider_realm_id).toBe(realmId);
            expect(result.role_realm_id).toBe(realmId);
        });

        it('should call preEvaluate with IDENTITY_PROVIDER_ROLE_CREATE', async () => {
            repository.onValidateJoinColumns((data: any) => {
                data.provider = { realm_id: null };
                data.role = { realm_id: null, client_id: null };
            });

            const actor = createAllowAllActor();
            await service.create({
                provider_id: randomUUID(),
                role_id: randomUUID(),
            }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.IDENTITY_PROVIDER_ROLE_CREATE });
        });

        it('should throw when actor lacks permission', async () => {
            await expect(
                service.create({
                    provider_id: randomUUID(),
                    role_id: randomUUID(),
                }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('should throw ConflictError on duplicate provider_id + role_id', async () => {
            const providerId = randomUUID();
            const roleId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.provider = { realm_id: null };
                data.role = { realm_id: null, client_id: null };
            });

            repository.seed({ provider_id: providerId, role_id: roleId });

            await expect(
                service.create({
                    provider_id: providerId,
                    role_id: roleId,
                }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_CONFLICT });
        });

        it('should throw BadRequestError when provider and role are in different realms', async () => {
            const providerRealmId = randomUUID();
            const roleRealmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.provider = { realm_id: providerRealmId };
                data.role = { realm_id: roleRealmId, client_id: null };
            });

            await expect(
                service.create({
                    provider_id: randomUUID(),
                    role_id: randomUUID(),
                }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });
        });

        it('should throw validation error when provider_id is missing', async () => {
            await expect(
                service.create({ role_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/provider_id/);
        });

        it('should throw validation error when role_id is missing', async () => {
            await expect(
                service.create({ provider_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/role_id/);
        });

        it('should throw validation error when provider_id is not a valid UUID', async () => {
            await expect(
                service.create({ provider_id: 'not-a-uuid', role_id: randomUUID() }, createAllowAllActor()),
            ).rejects.toThrow(/provider_id/);
        });

        it('should throw ForbiddenError when superset check fails', async () => {
            const realmId = randomUUID();

            repository.onValidateJoinColumns((data: any) => {
                data.provider = { realm_id: realmId };
                data.role = { realm_id: realmId, client_id: null };
            });

            identityPermissionProvider.setSuperset(false);

            await expect(
                service.create({
                    provider_id: randomUUID(),
                    role_id: randomUUID(),
                }, createMasterRealmActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });
    });

    describe('update', () => {
        it('should update optional fields', async () => {
            const entity = repository.seed({
                provider_id: randomUUID(),
                role_id: randomUUID(),
                name: 'old-name',
                value: 'old-value',
            });

            const result = await service.update(entity.id, { name: 'new-name', value: 'new-value' }, createAllowAllActor());
            expect(result.name).toBe('new-name');
            expect(result.value).toBe('new-value');
        });

        it('should throw NotFoundError when entity does not exist', async () => {
            await expect(
                service.update('non-existent-id', { name: 'test' }, createAllowAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should call preEvaluate with IDENTITY_PROVIDER_ROLE_UPDATE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.update(entity.id, { name: 'test' }, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.IDENTITY_PROVIDER_ROLE_UPDATE });
        });

        it('should throw when actor lacks permission', async () => {
            const entity = repository.seed({});
            await expect(
                service.update(entity.id, { name: 'test' }, createDenyAllActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('re-checks role ownership on update and blocks when the superset check fails (#3166)', async () => {
            const roleId = randomUUID();
            roleRepository.seed({ id: roleId, client_id: null } as Partial<Role>);
            const entity = repository.seed({
                provider_id: randomUUID(), 
                role_id: roleId, 
                name: 'old', 
            });

            identityPermissionProvider.setSuperset(false);

            await expect(
                service.update(entity.id, { value: '.*' }, createMasterRealmActor()),
            ).rejects.toMatchObject({ code: ErrorCode.PERMISSION_DENIED });
        });

        it('allows the update when the actor still owns the role', async () => {
            const roleId = randomUUID();
            roleRepository.seed({ id: roleId, client_id: null } as Partial<Role>);
            const entity = repository.seed({
                provider_id: randomUUID(), 
                role_id: roleId, 
                name: 'old', 
            });

            identityPermissionProvider.setSuperset(true);

            const result = await service.update(entity.id, { name: 'new' }, createMasterRealmActor());
            expect(result.name).toBe('new');
        });

        it('should not allow changing provider_id or role_id', async () => {
            const originalProviderId = randomUUID();
            const originalRoleId = randomUUID();
            const entity = repository.seed({
                provider_id: originalProviderId,
                role_id: originalRoleId,
            });

            const result = await service.update(
                entity.id,
                {
                    provider_id: randomUUID(), 
                    role_id: randomUUID(), 
                    name: 'updated', 
                },
                createAllowAllActor(),
            );
            expect(result.provider_id).toBe(originalProviderId);
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

        it('should call preEvaluate with IDENTITY_PROVIDER_ROLE_DELETE', async () => {
            const entity = repository.seed({});
            const actor = createAllowAllActor();
            await service.delete(entity.id, actor);
            expect(actor.permissionEvaluator.preEvaluateCalls).toContainEqual({ name: PermissionName.IDENTITY_PROVIDER_ROLE_DELETE });
        });
    });
});
